import { ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { Envelopes } from "../ScriptSynthInstrument";

export interface ScriptSynthWorkerRpcInterface {
  executeImmediateCommand(command: { newNote: any; releaseNote: any; panning: any; volume: any; vibrato: any; }): number | PromiseLike<number>;
  deleteInstrument(instrumentId: string): unknown;
  configure(sampleRate: number): Promise<void>;
  createInstrument(instrumentId: string, 
    instrument: ArrayBuffer,
    sampleRate: number,    
    loopStart: number, loopLen: number,
    volume: number,
    enterEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<void>;
  enqueueEvent(event: ScriptSynthEngineEvent): Promise<void>;
  panic(): Promise<void>;
}
