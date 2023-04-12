import { Base64ToUint8Array } from "../../../util/buffers";
import { EnvelopeCurveCoordinate, EnvelopeCurveState } from "../common/Envelopes";
import { WaveFormGenerator } from "../common/WaveFormGenerators";
import { IScriptSynthInstrumentFilter, IScriptSynthInstrumentNoteGenerator, ScriptSynthInstrument } from "./ScriptSynthInstrument";
import { FmInstrumentAlgorithmNodeDescriptor, FmInstrumentAlgorithmNodeOscillatorType } from "./worklet/ScriptSynthWorkerRpcInterface";

let ii=0;

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
  (startSample: number, sampleRate: number, EnvelopeCurveState: any) => 
    [(samplesToSkip: number) => number, (releaseAt: number) => void, (baseFrequencyArgStepsPerSample: number) => void];


class ScriptSynthInstrumentFmNoteGeneratorCodeGen implements IScriptSynthInstrumentNoteGenerator {
  
  private _volume: number = 1;
  private _panning: number = 1;
  private _pitchBend: number = 0;
  private _lastSample: number = 0;
  private _startSampleNumber: number = 0;
  private _note: number;
  private _outputSampleRate: number;

  private _algToneGenerator: ((skipCount: number) => number);
  private _algToneGeneratorRelease: ((releaseAt: number) => void);
  private _algToneGeneratorSetStepsPerSample: (baseFreqArgStepsPerSample: number) => void;

  vibratoGenerator: WaveFormGenerator | null = null;

  constructor(startSampleNumber: number, outputSampleRate: number, note: number,
      algToneGeneratorFns: [((skipCount: number) => number), (releaseAt: number) => void, (baseFreqArgStepsPerSample: number) => void]) {

    this._startSampleNumber = startSampleNumber;

    this._algToneGenerator = algToneGeneratorFns[0];
    this._algToneGeneratorRelease = algToneGeneratorFns[1];
    this._algToneGeneratorSetStepsPerSample = algToneGeneratorFns[2];

    this._note = note;
    this._outputSampleRate = outputSampleRate;

    this.loadNoteFrequency();
    
  }

  loadNoteFrequency() {
    const baseFreqArgStepsPerSample = (65.41 * Math.pow(2, ((this._note + this._pitchBend) / 12)) * STEPS_PER_SINE_CYCLE) / this._outputSampleRate;
    this._algToneGeneratorSetStepsPerSample(baseFreqArgStepsPerSample);
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
    this._algToneGeneratorRelease(releaseSampleNumber);
  }

  setVolume(volume: any) {
    this._volume = volume;
  }
  
  setPanning(panning: number) {
    this._panning = panning;
  }

  setPitchBend(pitchBend: number): void {
    this._pitchBend = pitchBend;
    this.loadNoteFrequency();
  }


  setVibratorGenerator(vibratoGenerator: WaveFormGenerator | null) {
    this.vibratoGenerator = vibratoGenerator;
  }
}

export class FmAlgorithmNode {
  private _stateSlot: number = -1;
  private _modulators: FmAlgorithmNode[];
  private _feedback: number;
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
      feedback: number,
      modulators: FmAlgorithmNode[]) {
    this._fixedFreq = fixedFreq;
    this._modulators = modulators;
    this._amplitudeEnvelope = amplitudeEnvelope;
    this._amplitudeReleaseEnvelope = amplitudeReleaseEnvelope;
    this._freqModifier = freqModifier;
    this._feedback = feedback;
    this._oscType = oscType;
  }

  allocateStateSlot(slotId: number) {
    if(this._stateSlot != -1) {
      throw new Error("Attempt to allocate slot to an already slot-allocated node");
    }

    this._stateSlot = slotId;
  }

  generateStateInitializationCode(stateSuffix: string) {        
    return `
      let currentSample${stateSuffix} = startSample;

      let currentArg${stateSuffix} = 0;
      let currentArgFrac${stateSuffix} = 0;

      let wholeArgStepsPerSample${stateSuffix} = 0;

      let feedbackNodeInput${stateSuffix} = 0;

      let envelopeState${stateSuffix} = 
        ${this.amplitudeEnvelope?.length 
          ? `EnvelopeCurveState(${JSON.stringify(this.amplitudeEnvelope)}, 1, startSample, sampleRate)`
          : 'null'};    `
  }

  generateFrequencyUpdateCode(stateSuffix: string) {
    const frequencyInitializer = 
      this._fixedFreq 
        ? `${this._freqModifier * STEPS_PER_SINE_CYCLE} / sampleRate`
        : `baseFrequencyArgStepsPerSample * ${this._freqModifier}`;


    return `wholeArgStepsPerSample${stateSuffix} = ${frequencyInitializer}`;
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
      let nodeOutput${stateSuffix} = ${baseAmplitudeCalculation}
      
      if(envelopeState${stateSuffix}) {
        envelopeState${stateSuffix}.updateEnvelopeState(currentSample${stateSuffix});  
        const envelope = envelopeState${stateSuffix}.currentValue;
        nodeOutput${stateSuffix} *= envelope * envelope;   
      }
      
      currentSample${stateSuffix} += samplesToSkip;
    `;

  }

  generateComputeNextSampleForOscilator(stateSuffix: string, modulatorStateSuffixes: string[]): string {
    const modValueTerms = 
      modulatorStateSuffixes.map(suffix => `nodeOutput${suffix}`);
    if(this._feedback) {
      modValueTerms.push(`${this._feedback} * feedbackNodeInput${stateSuffix}`);
    }
        
    let modValueCalculation = 
      modValueTerms.length 
        ? `(${modValueTerms.join(' + ')}) * ${1.6 * STEPS_PER_SINE_CYCLE}`
        : `0`;

    const feedbackUpdateCode =
      this._feedback ? `feedbackNodeInput${stateSuffix} = nodeOutput${stateSuffix}` : '';
        
    return `
      const modValue${stateSuffix} = ${modValueCalculation};
      
      let localCurrentArg${stateSuffix} = currentArg${stateSuffix};

      sampleToSkipCounter = samplesToSkip;
      
      while(sampleToSkipCounter--) {
        localCurrentArg${stateSuffix} += wholeArgStepsPerSample${stateSuffix};

        if(localCurrentArg${stateSuffix}>${STEPS_PER_SINE_CYCLE-1}) {
          localCurrentArg${stateSuffix} -= ${STEPS_PER_SINE_CYCLE};
        }
      }


      let currentModulatedArg${stateSuffix} = (localCurrentArg${stateSuffix} + modValue${stateSuffix}) & ${STEPS_PER_SINE_CYCLE-1};

      let nodeOutput${stateSuffix} = SinLookup[currentModulatedArg${stateSuffix}];

      if(envelopeState${stateSuffix}) {
        envelopeState${stateSuffix}.updateEnvelopeState(currentSample${stateSuffix});  
        const envelope = envelopeState${stateSuffix}.currentValue;
        nodeOutput${stateSuffix} *= envelope * envelope;   
      }

      currentSample${stateSuffix} += samplesToSkip;
      currentArg${stateSuffix} = localCurrentArg${stateSuffix};
      ${feedbackUpdateCode}
    `
  }

  generateRelease(stateSuffix: string): any {
    if(this._amplitudeReleaseEnvelope?.length) {
      return `
        envelopeState${stateSuffix} = EnvelopeCurveState(${JSON.stringify(this._amplitudeReleaseEnvelope)}, envelopeState${stateSuffix}?.currentValue ?? 1, releaseAt, sampleRate);
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

    const setBaseFrequencyBody = this._nodesBySlot
      .map((node) => node.generateFrequencyUpdateCode(`Node${node.stateSlot}`))
      .join('\n\n');
    
    const stateComputationBody = this._nodesBySlot.reverse().map((node) => 
        node.generateComputeNextSample(
          `Node${node.stateSlot}`, 
          node.modulators.map(modulator => `Node${modulator.stateSlot}`)))
          .join('\n\n');


    const releaseBody = this._nodesBySlot.reverse().map((node) => 
        node.generateRelease(
          `Node${node.stateSlot}`))
          .join('\n\n');


    const overallCode = `(startSample, sampleRate, EnvelopeCurveState) => {
      ${stateVarsInitialization}

      let releasing = false;

      const computeNextSample = (samplesToSkip) => {
        let sampleToSkipCounter = 0;

        ${stateComputationBody}
        
        if(releasing && !envelopeStateNode${this._algo.stateSlot}?.running) {
          return null;
        }
        
        return nodeOutputNode${this._algo.stateSlot};
      };

      const release = (releaseAt) => {
        releasing = true;

        ${releaseBody}        
      }

      const setBaseFrequency = (baseFrequencyArgStepsPerSample) => {
        ${setBaseFrequencyBody}
      }

      return [computeNextSample, release, setBaseFrequency];
    }`;

    //console.log(overallCode);
    return eval(overallCode);
  }


  createNoteGenerator(note: number, outputSampleRate: number, startSampleNumber: number) : IScriptSynthInstrumentNoteGenerator {    
    return new ScriptSynthInstrumentFmNoteGeneratorCodeGen(startSampleNumber, outputSampleRate, note, 
      this._algoToneGeneratorFactory(startSampleNumber, 
        outputSampleRate,         
        (e: EnvelopeCurveCoordinate[], s: number, r: number, t: number) => new EnvelopeCurveState(e, s, r, t)));
  }

  override createFilterState(outputSampleRate: number): IScriptSynthInstrumentFilter | null {
    return new WasmFilterState();
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
          
          algoNodeDescriptor.feedback,
          
          algoNodeDescriptor.modulators.map(modulator => createInstrumentAlgoNode(modulator))
        );
    };

    return new ScriptSynthFmInstrument(createInstrumentAlgoNode(descriptor));
  }
}



//let loadedFilters: any[] | null = null;

let wasmModule: any;
const numFilterHandles = 32;
let nextHandleToAlloc = 0;
let filterBufferStartOfs = 0;
const filterMemory = new WebAssembly.Memory({initial: 10});

async function initializeFilters() {
   
    const wasmContent = require('!!uint8array-loader!./wasm/synthRoutines.wasm.embed');
    
    wasmModule = await WebAssembly.instantiate(wasmContent!, {
      "js": {
        "memory": filterMemory
      }
    });

    filterBufferStartOfs = wasmModule.instance.exports.allocFilterHandles(numFilterHandles, 1024);
    const filterArray = new Float64Array(filterMemory.buffer, filterBufferStartOfs, 16384);

    for(let i=0; i<256; i++) {
      filterArray[i] = 0.02;  
    }
    
    console.log('filters loaded!');
}

function allocFilterHandle() {
  const ret = nextHandleToAlloc++;
  if(nextHandleToAlloc > numFilterHandles) {
    nextHandleToAlloc = 0;
  }
  return ret;
}

try { 
  initializeFilters();
} catch(e) {
  console.log("error loading filters", e);  
}

class WasmFilterState implements IScriptSynthInstrumentFilter {
  filterHandle1: number;
  filterHandle2: number;

  constructor() {
    this.filterHandle1 = allocFilterHandle();
    this.filterHandle2 = allocFilterHandle();

    wasmModule.instance.exports.initFilter(this.filterHandle1, filterBufferStartOfs, 256);
    wasmModule.instance.exports.initFilter(this.filterHandle2, filterBufferStartOfs, 256);
  }

  filter(inputOutput: number[]): void {

    inputOutput[0] = 
      wasmModule.instance.exports.applyFilter(this.filterHandle1, inputOutput[0]);
    inputOutput[1] = 
      wasmModule.instance.exports.applyFilter(this.filterHandle2, inputOutput[1]);

  }

}