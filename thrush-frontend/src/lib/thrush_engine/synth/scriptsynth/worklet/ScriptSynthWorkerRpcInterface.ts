import { ScriptSynthEngineEvent } from "../ScriptSynthEngine";

export interface ScriptSynthWorkerRpcInterface {
  configure(sampleRate: number): Promise<void>;
  createInstrument(instrument: ArrayBuffer,
    sampleRate: number,
    sampleStart: number,
    loopStart: number, loopLen: number,
    volume: number): Promise<number>;
  enqueueEvent(event: ScriptSynthEngineEvent): Promise<void>;
  panic(): Promise<void>;
}
