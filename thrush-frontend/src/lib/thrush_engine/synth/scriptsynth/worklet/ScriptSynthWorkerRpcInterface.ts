import { EnvelopeCurveCoordinate } from "../../common/Envelopes";
import { ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { Envelopes } from "../ScriptSynthInstrumentWave";


export type FmInstrumentAlgorithmNodeOscillatorType = "sine" | "adder";


export type FmInstrumentAlgorithmNodeDescriptor = {
  oscType: FmInstrumentAlgorithmNodeOscillatorType;
  
  freqType: "fixed" | "multiplier",
  freqValue: number,

  attackEnvelope: EnvelopeCurveCoordinate[],
  releaseEnvelope: EnvelopeCurveCoordinate[],

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
    algorithm: FmInstrumentAlgorithmNodeDescriptor): Promise<void>;
  
  enqueueEvent(event: ScriptSynthEngineEvent): Promise<void>;
  
  panic(): Promise<void>;
}
