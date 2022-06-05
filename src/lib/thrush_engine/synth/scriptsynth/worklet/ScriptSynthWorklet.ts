import { ScriptSynthEngine, ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { ScriptSynthWaveInstrument } from "../ScriptSynthInstrument";
import { ScriptSynthWorkerRpcInterface } from "./ScriptSynthWorkerRpcInterface";
import { MessagePortRpcDispatcher } from "../../../../util/MessagePortRpc";


class WorkletProcessor extends AudioWorkletProcessor implements ScriptSynthWorkerRpcInterface {
  _rpcDispathcer: MessagePortRpcDispatcher<ScriptSynthWorkerRpcInterface>;
  _synthEngine: ScriptSynthEngine | null = null;

  constructor() {
    super();
    this._rpcDispathcer = new MessagePortRpcDispatcher<ScriptSynthWorkerRpcInterface>(this.port, this);
  }

  async enqueueEvent(event: ScriptSynthEngineEvent): Promise<void> {
    if(!this._synthEngine) {
      throw Error("Node not conigured")
    }

    this._synthEngine.enqueueEvent(event);
  }

  async clearEventQueue(): Promise<void> {
    if(!this._synthEngine) {
      throw Error("Node not conigured")
    }

    this._synthEngine.clearQueue();
  }

  async createInstrument(
    instrumentBuff: ArrayBuffer,
    sampleRate: number,
    sampleStart: number,
    loopStart: number, loopLen: number,
    volume: number): Promise<number> {
    if(!this._synthEngine) {
      throw Error("Node not conigured")
    }

    return this._synthEngine.registerInstrument(
      ScriptSynthWaveInstrument.fromSampleBuffer(
        instrumentBuff,
        sampleRate,
        sampleStart,
        loopStart, loopLen,
        volume
        ));
  }

  async configure(sampleRate: number) {
    this._synthEngine = new ScriptSynthEngine(sampleRate, 16);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    this._synthEngine!.fillSampleBuffer(currentTime, outputs[0][0], outputs[0][1], 0, outputs[0][0].length);
    return true;
  }
}

registerProcessor("scriptsynth-audio-worker", WorkletProcessor);

