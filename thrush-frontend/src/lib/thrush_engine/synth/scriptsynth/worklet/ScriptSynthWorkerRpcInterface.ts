import { ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { Envelopes } from "../ScriptSynthInstrument";

export interface ScriptSynthWorkerRpcInterface {
  executeImmediateCommand(arg0: { newNote: any; releaseNote: any; panning: any; volume: any; vibrato: any; }): number | PromiseLike<number>;
  deleteInstrument(instrumentHandle: number): unknown;
  updateInstrument(instrumentHandle: number, 
    instrument: ArrayBuffer, 
    sampleRate: number, 
    loopStart: number, 
    loopLen: number, 
    volume: number, 
    entryEnvelopes: Envelopes | undefined, 
    exitEnvelopes: Envelopes | undefined): Promise<void>;
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
