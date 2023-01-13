import { ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { Envelopes } from "../ScriptSynthInstrument";

export interface ScriptSynthWorkerRpcInterface {
  configure(sampleRate: number): Promise<void>;
  createInstrument(instrument: ArrayBuffer,
    sampleRate: number,    
    loopStart: number, loopLen: number,
    volume: number,
    enterEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<number>;
  enqueueEvent(event: ScriptSynthEngineEvent): Promise<void>;
  panic(): Promise<void>;
}
