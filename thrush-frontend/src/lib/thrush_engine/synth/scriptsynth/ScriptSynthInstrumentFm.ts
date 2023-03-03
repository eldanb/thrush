import { EnvelopeCurveCoordinate, EnvelopeCurveState } from "../common/Envelopes";
import { WaveFormGenerator } from "../common/WaveFormGenerators";
import { IScriptSynthInstrumentNoteGenerator, ScriptSynthInstrument } from "./ScriptSynthInstrument";
import { FmInstrumentAlgorithmNodeDescriptor, FmInstrumentAlgorithmNodeOscillatorType } from "./worklet/ScriptSynthWorkerRpcInterface";


const STEPS_PER_SINE_CYCLE = 2048;

type FmAlgorithmNodeState = {
  currentSample: number;
  sampleRate: number;
  
  currentArg: number;
  currentArgFrac: number;

  wholeArgStepsPerSample: number;
  fracArgStepsPerSample: number;
  envelopeState: EnvelopeCurveState | null;
}

type FmToneGeneratorFactory = 
  (startSample: number, sampleRate: number, baseFrequencyArgStepsPerSample: number, EnvelopeCurveState: any) => 
    [(samplesToSkip: number) => number, () => void];


class ScriptSynthInstrumentFmNoteGeneratorCodeGen implements IScriptSynthInstrumentNoteGenerator {
  
  private _volume: number = 1;
  private _panning: number = 1;
  private _lastSample: number = 0;
  private _startSampleNumber: number = 0;
  private _algToneGenerator: ((skipCount: number) => number);
  private _algToneGeneratorRelease: (() => void);

  vibratoGenerator: WaveFormGenerator | null = null;

  constructor(startSampleNumber: number,
      algToneGeneratorFns: [((skipCount: number) => number), () => void]) {
    this._startSampleNumber = startSampleNumber;
    this._algToneGenerator = algToneGeneratorFns[0];
    this._algToneGeneratorRelease = algToneGeneratorFns[1];
  }

  getNoteSample(currentSample: number, currentTime: number, outChannels: number[]): boolean {
    const noteRelSample = currentSample - this._startSampleNumber;

    const baseSample = this._algToneGenerator(noteRelSample - this._lastSample);
    if(baseSample == null) {
      return false;
    }

    const sampleEffectivePanning = this._panning;
    const sampleVolume = this._volume;

    outChannels[0] += baseSample * (1-sampleEffectivePanning) * sampleVolume;
    outChannels[1] += baseSample * sampleEffectivePanning * sampleVolume;

    this._lastSample = noteRelSample;

    return true;
  }

  releaseNote(releaseSampleNumber: number): void {
    this._algToneGeneratorRelease();
  }

  setVolume(volume: any) {
    this._volume = volume;
  }
  
  setPanning(panning: number) {
    this._panning = panning;
  }

  setVibratorGenerator(vibratoGenerator: WaveFormGenerator | null) {
    this.vibratoGenerator = vibratoGenerator;
  }
}

export class FmAlgorithmNode {
  private _stateSlot: number = -1;
  private _modulators: FmAlgorithmNode[];
  private _freqModifier: number;
  private _fixedFreq: boolean;
  private _amplitudeEnvelope: EnvelopeCurveCoordinate[];
  private _amplitudeReleaseEnvelope: EnvelopeCurveCoordinate[];
  private _oscType: FmInstrumentAlgorithmNodeOscillatorType;

  constructor(
      oscType: FmInstrumentAlgorithmNodeOscillatorType,
      fixedFreq: boolean, 
      freqModifier: number, 
      amplitudeEnvelope: EnvelopeCurveCoordinate[], 
      amplitudeReleaseEnvelope: EnvelopeCurveCoordinate[],
      modulators: FmAlgorithmNode[]) {
    this._fixedFreq = fixedFreq;
    this._modulators = modulators;
    this._amplitudeEnvelope = amplitudeEnvelope;
    this._amplitudeReleaseEnvelope = amplitudeReleaseEnvelope;
    this._freqModifier = freqModifier;
    this._oscType = oscType;
  }

  allocateStateSlot(slotId: number) {
    if(this._stateSlot != -1) {
      throw new Error("Attempt to allocate slot to an already slot-allocated node");
    }

    this._stateSlot = slotId;
  }

  initializeStateSlot(baseFreqArgStepsPerSample: number, startSample: number, sampleRate: number): FmAlgorithmNodeState {
    const slotArgSteps = baseFreqArgStepsPerSample * this._freqModifier;
    return {
      currentSample: startSample,
      sampleRate: sampleRate,

      currentArg: 0,
      currentArgFrac: 0,
      wholeArgStepsPerSample: Math.floor(slotArgSteps),
      fracArgStepsPerSample: Math.round((slotArgSteps - Math.floor(slotArgSteps)) * STEPS_PER_SINE_CYCLE),
      envelopeState: this._amplitudeEnvelope?.length 
                        ? new EnvelopeCurveState(this._amplitudeEnvelope, 1, startSample, sampleRate) 
                        : null
    }
  }

  generateStateInitializationCode(stateSuffix: string) {    
    const frequencyInitializer = 
      this._fixedFreq 
        ? `${this._freqModifier * STEPS_PER_SINE_CYCLE} / sampleRate`
        : `baseFrequencyArgStepsPerSample * ${this._freqModifier}`;

    return `
      let currentSample${stateSuffix} = startSample;

      let currentArg${stateSuffix} = 0;
      let currentArgFrac${stateSuffix} = 0;

      const wholeArgStepsPerSample${stateSuffix} = ${frequencyInitializer};

      let envelopeState${stateSuffix} = 
        ${this.amplitudeEnvelope?.length 
          ? `EnvelopeCurveState(${JSON.stringify(this.amplitudeEnvelope)}, 1, startSample, sampleRate)`
          : 'null'};    `
  }

  public releaseNote(state: FmAlgorithmNodeState[], startSample: number) {
    this._modulators.forEach((m) => m.releaseNote(state, startSample));
    const stateSlot = state[this._stateSlot];
    if(this._amplitudeReleaseEnvelope?.length) {
      stateSlot.envelopeState = new EnvelopeCurveState(this._amplitudeReleaseEnvelope, 
        stateSlot.envelopeState?.currentValue ?? 1, startSample, stateSlot.sampleRate);
    }
  }


  public computeNextSample(state: FmAlgorithmNodeState[], samplesToSkip: number): number {
    const numMods = this._modulators.length;
    let modValue = 0;
    for(let modulatorIndex=0; modulatorIndex<numMods; modulatorIndex++) {
      modValue += this._modulators[modulatorIndex].computeNextSample(state, samplesToSkip);      
    }

    const stateSlot = state[this._stateSlot];
    let currentArg = stateSlot.currentArg;
    let currentArgFrac = stateSlot.currentArgFrac;

    stateSlot.envelopeState?.updateEnvelopeState(stateSlot.currentSample);
    stateSlot.currentSample += samplesToSkip;

    while(samplesToSkip--) {
      currentArgFrac += stateSlot.fracArgStepsPerSample;
      if(currentArgFrac > STEPS_PER_SINE_CYCLE) {
        currentArgFrac -= STEPS_PER_SINE_CYCLE;
        currentArg++;
      }

      currentArg += stateSlot.wholeArgStepsPerSample;

      if(currentArg>STEPS_PER_SINE_CYCLE) {
        currentArg -= STEPS_PER_SINE_CYCLE;
      }
    }

    stateSlot.currentArg = currentArg;
    stateSlot.currentArgFrac = currentArgFrac;

    currentArg += Math.round(modValue*1.6*STEPS_PER_SINE_CYCLE);

    while(currentArg >= STEPS_PER_SINE_CYCLE) {
     currentArg -= STEPS_PER_SINE_CYCLE;
    } 
    
    while(currentArg < 0) {
      currentArg += STEPS_PER_SINE_CYCLE;
    }

    const baseWav = SinLookup[currentArg];
    const envelope = stateSlot.envelopeState?.currentValue ?? 1;

    return baseWav * envelope * envelope;
  }

  generateComputeNextSample(stateSuffix: string, modulatorStateSuffixes: string[]): string {
    if(this._oscType == 'adder') {
      return this.generateComputeNextSampleForAdder(stateSuffix, modulatorStateSuffixes);
    } else {
      return this.generateComputeNextSampleForOscilator(stateSuffix, modulatorStateSuffixes);
    }
  }

  generateComputeNextSampleForAdder(stateSuffix: string, modulatorStateSuffixes: string[]): string {
    const baseAmplitudeCalculation = 
      this._modulators.length 
        ? `(${modulatorStateSuffixes.map(suffix => `nodeOutput${suffix}`).join(' + ')})`
        : `0`;
        
    return `
      const nodeOutput${stateSuffix} = ${baseAmplitudeCalculation}
      
      if(envelopeState${stateSuffix}) {
        envelopeState${stateSuffix}.updateEnvelopeState(currentSample${stateSuffix});  
        const envelope = envelopeState${stateSuffix}.currentValue;
        nodeOutput${stateSuffix} *= envelope * envelope;   
      }      
    `;

  }

  generateComputeNextSampleForOscilator(stateSuffix: string, modulatorStateSuffixes: string[]): string {
    const modValueCalculation = 
      this._modulators.length 
        ? `
          (${modulatorStateSuffixes.map(suffix => `nodeOutput${suffix}`).join(' + ')})
          * 1.6 * ${STEPS_PER_SINE_CYCLE}`
        : `0`;
        
    return `
      const modValue${stateSuffix} = ${modValueCalculation};
      
      sampleToSkipCounter = samplesToSkip;
      while(sampleToSkipCounter--) {
        currentArg${stateSuffix} += wholeArgStepsPerSample${stateSuffix};

        if(currentArg${stateSuffix}>${STEPS_PER_SINE_CYCLE}) {
          currentArg${stateSuffix} -= ${STEPS_PER_SINE_CYCLE};
        }
      }

      let currentModulatedArg${stateSuffix} = Math.round(currentArg${stateSuffix} + modValue${stateSuffix}) & (${STEPS_PER_SINE_CYCLE}-1);


      let nodeOutput${stateSuffix} = SinLookup[currentModulatedArg${stateSuffix}];

      if(envelopeState${stateSuffix}) {
        envelopeState${stateSuffix}.updateEnvelopeState(currentSample${stateSuffix});  
        const envelope = envelopeState${stateSuffix}.currentValue;
        nodeOutput${stateSuffix} *= envelope * envelope;   
      }

      currentSample${stateSuffix} += samplesToSkip;
    `  
  }

  generateRelease(stateSuffix: string): any {
    if(this._amplitudeReleaseEnvelope?.length) {
      return `
        envelopeState${stateSuffix} = EnvelopeCurveState(${JSON.stringify(this._amplitudeReleaseEnvelope)}, envelopeState${stateSuffix}?.currentValue ?? 1, startSample, sampleRate);
      `
    } else {
      return ``;
    }    
  }

  public get modulators() {
    return this._modulators;
  }

  public get amplitudeEnvelope() {
    return this._amplitudeEnvelope;
  }

  isEnvelopeRunning(algState: FmAlgorithmNodeState[]) {
    return algState[this._stateSlot].envelopeState?.running;
  }
  
  get stateSlot() {
    return this._stateSlot;
  }

}

const SinLookup: number[] = [];
for(let idx=0; idx < STEPS_PER_SINE_CYCLE; idx++) {
  SinLookup[idx] = Math.sin((idx / STEPS_PER_SINE_CYCLE) * 2 * Math.PI);
}


export class ScriptSynthFmInstrument extends ScriptSynthInstrument {
  private _algo: FmAlgorithmNode;
  private _algoToneGeneratorFactory: FmToneGeneratorFactory;
  private _nodesBySlot: FmAlgorithmNode[] = [];

  constructor(algo: FmAlgorithmNode) {
    super();
    this._algo = algo;
    this.allocateStateSlots();
    this._algoToneGeneratorFactory = this.compileFmAlgorithm();
  }


  private allocateStateSlots(): void {
    this._nodesBySlot = [this._algo];    
    for(let stackIndex = 0; stackIndex < this._nodesBySlot.length; stackIndex++) {
      const currentNode = this._nodesBySlot[stackIndex];
      currentNode.allocateStateSlot(stackIndex);
      this._nodesBySlot.push(...currentNode.modulators);      
    }    
  }

  private compileFmAlgorithm(): FmToneGeneratorFactory {
    const stateVarsInitialization = 
      this._nodesBySlot.map((node, slotIndex) => 
        node.generateStateInitializationCode(`Node${slotIndex}`)
      ).join('\n\n');

    const stateComputationBody = this._nodesBySlot.reverse().map((node) => 
        node.generateComputeNextSample(
          `Node${node.stateSlot}`, 
          node.modulators.map(modulator => `Node${modulator.stateSlot}`)))
          .join('\n\n');


    const releaseBody = this._nodesBySlot.reverse().map((node) => 
        node.generateRelease(
          `Node${node.stateSlot}`))
          .join('\n\n');

    const overallCode = `(startSample, sampleRate, baseFrequencyArgStepsPerSample, EnvelopeCurveState) => {
      ${stateVarsInitialization}

      let releasing = false;

      const computeNextSample = (samplesToSkip) => {
        let sampleToSkipCounter;

        ${stateComputationBody}
        
        if(releasing && !envelopeStateNode${this._algo.stateSlot}?.running) {
          return null;
        }
        
        return nodeOutputNode${this._algo.stateSlot};
      };

      const release = () => {
        releasing = true;

        ${releaseBody}        
      }

      return [computeNextSample, release];
    }`;

    //console.log(overallCode);
    return eval(overallCode);
  }

  public initializeState(baseFreqArgStepsPerSample: number, startSampleNumber: number, outputSampleRate: number): FmAlgorithmNodeState[] {    
    const ret: FmAlgorithmNodeState[] = [];
    return this._nodesBySlot.map((node, nodeIndex) => {
      return node.initializeStateSlot(baseFreqArgStepsPerSample, startSampleNumber, outputSampleRate);
    });
  }


  createNoteGenerator(note: number, outputSampleRate: number, startSampleNumber: number) : IScriptSynthInstrumentNoteGenerator {
    const baseFreqArgStepsPerSample = (65.41 * Math.pow(2, (note / 12)) * STEPS_PER_SINE_CYCLE) / outputSampleRate;
    //return new ScriptSynthInstrumentFmNoteGenerator(this._algo, this.initializeState(baseFreqArgStepsPerSample, startSampleNumber, outputSampleRate), startSampleNumber);

    return new ScriptSynthInstrumentFmNoteGeneratorCodeGen(startSampleNumber,  
      this._algoToneGeneratorFactory(startSampleNumber, 
        outputSampleRate, 
        baseFreqArgStepsPerSample, 
        (e: EnvelopeCurveCoordinate[], s: number, r: number, t: number) => new EnvelopeCurveState(e, s, r, t)));
  }

  get algo(): FmAlgorithmNode {
    return this._algo;
  }

  static fromDescriptor(descriptor: FmInstrumentAlgorithmNodeDescriptor): ScriptSynthFmInstrument {
    function createInstrumentAlgoNode(algoNodeDescriptor: FmInstrumentAlgorithmNodeDescriptor) : FmAlgorithmNode {       
      return new FmAlgorithmNode(    
          algoNodeDescriptor.oscType,  
          
          algoNodeDescriptor.freqType == 'fixed',      
          algoNodeDescriptor.freqValue,
          

          algoNodeDescriptor.attackEnvelope,
          algoNodeDescriptor.releaseEnvelope,

          algoNodeDescriptor.modulators.map(modulator => createInstrumentAlgoNode(modulator))
        );
    };

    return new ScriptSynthFmInstrument(createInstrumentAlgoNode(descriptor));
  }
}
