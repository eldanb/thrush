import { ScriptSynthEngine, ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { Envelopes, ScriptSynthWaveInstrument } from "../ScriptSynthInstrument";
import { ScriptSynthWorkerRpcInterface } from "./ScriptSynthWorkerRpcInterface";
import { MessagePortRpcDispatcher } from "../../../../util/MessagePortRpc";

class WorkletProcessor extends AudioWorkletProcessor implements ScriptSynthWorkerRpcInterface {
  _rpcDispathcer: MessagePortRpcDispatcher<ScriptSynthWorkerRpcInterface>;
  _synthEngine: ScriptSynthEngine | null = null;
  
  constructor() {
    super();
    this._rpcDispathcer = new MessagePortRpcDispatcher<ScriptSynthWorkerRpcInterface>(this.port, this);
  }

  async executeImmediateCommand(command: { newNote: any; releaseNote: any; panning: any; volume: any; vibrato: any; }): Promise<number> {
    return this._synthEngine!.enqueueRealtimeEvent(Object.assign(
      command,
      {
        time: currentTime + 0.05,
        channelOrNoteId: '$$immediate'
      }));
  }

  async deleteInstrument(instrumentHandle: number): Promise<void> {
    this._synthEngine!.deleteInstrument(instrumentHandle);
  }

  async updateInstrument(instrumentHandle: number, instrumentBuff: ArrayBuffer, sampleRate: number, loopStart: number, loopLen: number, volume: number, entryEnvelopes: Envelopes | undefined, exitEnvelopes: Envelopes | undefined): Promise<void> {
    this._synthEngine!.updateInstrument(instrumentHandle, new ScriptSynthWaveInstrument(
      new Float32Array(instrumentBuff),
      sampleRate,
      loopStart, loopLen,
      volume, 
      entryEnvelopes,
      exitEnvelopes
      ));
  }

  async enqueueEvent(event: ScriptSynthEngineEvent): Promise<void> {
    if(!this._synthEngine) {
      throw Error("Node not configured")
    }

    this._synthEngine.enqueueEvent(event);
  }

  async panic(): Promise<void> {
    if(!this._synthEngine) {
      throw Error("Node not configured")
    }

    this._synthEngine.panic();
  }

  async createInstrument(
    instrumentBuff: ArrayBuffer,
    sampleRate: number,
    loopStart: number, loopLen: number,
    volume: number,
    entryEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<number> {
    if(!this._synthEngine) {
      throw Error("Node not conigured")
    }

    return this._synthEngine.registerInstrument(
      new ScriptSynthWaveInstrument(
        new Float32Array(instrumentBuff),
        sampleRate,
        loopStart, loopLen,
        volume, 
        entryEnvelopes,
        exitEnvelopes
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

