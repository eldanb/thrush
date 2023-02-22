import { EnvelopeCurveCoordinate, EnvelopeCurveState } from "../common/Envelopes";
import { WaveFormGenerator } from "../common/WaveFormGenerators";
import { IScriptSynthInstrumentNoteGenerator, ScriptSynthInstrument } from "./ScriptSynthInstrument";

export type Envelopes = {
  volume: EnvelopeCurveCoordinate[];
}

const STEPS_PER_SINE_CYCLE = 2048;

type EnvelopeState = {
  [envelope in keyof Envelopes]: EnvelopeCurveState;
}

class ScriptSynthInstrumentFmNoteGenerator implements IScriptSynthInstrumentNoteGenerator {
  
  private _releasing: boolean = false;
  private _volume: number = 1;
  private _panning: number = 1;
  private _alg: FmAlgorithmNode;
  private _algState: FmAlgorithmNodeState[];
  private _lastSample: number = 0;
  private _startSampleNumber: number = 0;

  vibratoGenerator: WaveFormGenerator | null = null;

  constructor(algo: FmAlgorithmNode, algoState: FmAlgorithmNodeState[], startSampleNumber: number) {
    this._alg = algo;
    this._algState = algoState;
    this._startSampleNumber = startSampleNumber;
  }

  getNoteSample(currentSample: number, currentTime: number, outChannels: number[]): boolean {
    if(this._releasing) {
      return false;
    }

    const noteRelSample = currentSample - this._startSampleNumber;
    const baseSample = this._alg.computeNextSample(this._algState, noteRelSample - this._lastSample);

    const sampleEffectivePanning = this._panning;

    outChannels[0] += baseSample * (1-sampleEffectivePanning);
    outChannels[1] += baseSample * sampleEffectivePanning;

    this._lastSample = noteRelSample;

    return true;
  }

  releaseNote(releaseSampleNumber: number): void {
    this._releasing = true;
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

type FmAlgorithmNodeState = {
  currentArg: number;
  currentArgFrac: number;
  wholeArgStepsPerSample: number;
  fracArgStepsPerSample: number;
}

export class FmAlgorithmNode {
  private _stateSlot: number = -1;
  private _modulators: FmAlgorithmNode[];
  private _amplitudeEnvelope: EnvelopeCurveCoordinate[];

  constructor(amplitudeEnvelope: EnvelopeCurveCoordinate[], modulators: FmAlgorithmNode[]) {
    this._modulators = modulators;
    this._amplitudeEnvelope = amplitudeEnvelope;
  }

  allocateStateSlot(slotId: number) {
    if(this._stateSlot != -1) {
      throw new Error("Attempt to allocate slot to an already slot-allocated node");
    }

    this._stateSlot = slotId;
  }

  public computeNextSample(state: FmAlgorithmNodeState[], samplesToSkip: number): number {
    const numMods = this._modulators.length;
    let modValue = 0;
    for(let modulatorIndex=0; modulatorIndex<numMods; modulatorIndex++) {
      modValue += this._modulators[modulatorIndex].computeNextSample(state, samplesToSkip)*10;      
    }

    const stateSlot = state[this._stateSlot];
    let currentArg = stateSlot.currentArg;
    let currentArgFrac = stateSlot.currentArgFrac;

    while(samplesToSkip--) {
      currentArgFrac += stateSlot.fracArgStepsPerSample;
      if(currentArgFrac > STEPS_PER_SINE_CYCLE) {
        currentArgFrac -= STEPS_PER_SINE_CYCLE;
        currentArg++;
      }

      currentArg += Math.round(modValue) + stateSlot.wholeArgStepsPerSample;
    }

    if(currentArg >= STEPS_PER_SINE_CYCLE) {
      currentArg -= STEPS_PER_SINE_CYCLE;
    }

    stateSlot.currentArg = currentArg;
    stateSlot.currentArgFrac = currentArgFrac;
    
    return SinLookup[currentArg];
  }

  public get modulators() {
    return this._modulators;
  }
}

const SinLookup: number[] = [];
for(let idx=0; idx < STEPS_PER_SINE_CYCLE; idx++) {
  SinLookup[idx] = Math.sin((idx / STEPS_PER_SINE_CYCLE) * 2 * Math.PI)*0.9;
}


export class ScriptSynthFmInstrument extends ScriptSynthInstrument {
  private _algo: FmAlgorithmNode;
  private _numSlots: number = -1;

  constructor(algo: FmAlgorithmNode) {
    super();
    this._algo = algo;
    this.allocateStateSlots();
  }


  private allocateStateSlots(): void {
    const walkStack: FmAlgorithmNode[] = [this._algo];
    let slotId = 0;
    for(let stackIndex = 0; stackIndex < walkStack.length; stackIndex++) {
      const currentNode = walkStack[stackIndex];
      currentNode.allocateStateSlot(slotId++);
      walkStack.push(...currentNode.modulators);      
    }

    this._numSlots = slotId;
  }

  public initializeState(argStepsPerSample: number): FmAlgorithmNodeState[] {    
    const ret: FmAlgorithmNodeState[] = [];
    for(let idx = 0; idx < this._numSlots; idx++) {
      ret[idx] = {
        currentArg: 0,
        currentArgFrac: 0,
        wholeArgStepsPerSample: Math.floor(argStepsPerSample),
        fracArgStepsPerSample: Math.round((argStepsPerSample - Math.floor(argStepsPerSample)) * STEPS_PER_SINE_CYCLE)
      }
    }

    return ret;
  }


  createNoteGenerator(note: number, outputSampleRate: number, startSampleNumber: number) : IScriptSynthInstrumentNoteGenerator {
    const argStepsPerSample = (65.41 * Math.pow(2, (note / 12)) * STEPS_PER_SINE_CYCLE) / outputSampleRate;
    return new ScriptSynthInstrumentFmNoteGenerator(this._algo, this.initializeState(argStepsPerSample), startSampleNumber);
  }

  get algo(): FmAlgorithmNode {
    return this._algo;
  }


}

const bla: FmAlgorithmNodeState[] = [];