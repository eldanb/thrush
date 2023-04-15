import { EnvelopeCurveCoordinate } from "../../common/Envelopes";
import { ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { ChorusEffectParameters, EqFilterParameters } from "../ScriptSynthInstrumentFm";
import { Envelopes } from "../ScriptSynthInstrumentWave";


export type FmInstrumentAlgorithmNodeOscillatorType = "sine" | "adder";

export type FmInstrumentDescriptor = {
  rootAlgorithmNode: FmInstrumentAlgorithmNodeDescriptor;  
  chorusFilterParameters?: ChorusEffectParameters;
  eqFilterParameters?: EqFilterParameters;
}

export type FmInstrumentAlgorithmNodeDescriptor = {
  oscType: FmInstrumentAlgorithmNodeOscillatorType;
  
  freqType: "fixed" | "multiplier",
  freqValue: number,

  attackEnvelope: EnvelopeCurveCoordinate[],
  releaseEnvelope: EnvelopeCurveCoordinate[],

  feedback: number,

  modulators: FmInstrumentAlgorithmNodeDescriptor[]
};

export interface ScriptSynthWorkerRpcInterface {
  executeImmediateCommand(command: { newNote: any; releaseNote: any; panning: any; volume: any; vibrato: any; }): number | PromiseLike<number>;
  deleteInstrument(instrumentId: string): unknown;
  configure(sampleRate: number): Promise<void>;
  createWaveInstrument(instrumentId: string, 
    instrument: ArrayBuffer,
    sampleRate: number,    
    loopStart: number, loopLen: number,
    volume: number,
    enterEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<void>;

  createFmInstrument(instrumentId: string, 
    instrumentDescriptor: FmInstrumentDescriptor): Promise<void>;
  
  enqueueEvent(event: ScriptSynthEngineEvent): Promise<void>;
  
  panic(): Promise<void>;
}
