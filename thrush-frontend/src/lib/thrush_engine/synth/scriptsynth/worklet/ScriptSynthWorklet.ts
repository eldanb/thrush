import { MessagePortRpcDispatcher } from "../../../../util/MessagePortRpc";
import { ScriptSynthEngine, ScriptSynthEngineEvent } from "../ScriptSynthEngine";
import { ScriptSynthFmInstrument } from "../ScriptSynthInstrumentFm";
import { Envelopes, ScriptSynthWaveInstrument } from "../ScriptSynthInstrumentWave";
import { FmInstrumentAlgorithmNodeDescriptor, ScriptSynthWorkerRpcInterface } from "./ScriptSynthWorkerRpcInterface";

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

  async deleteInstrument(instrumentHandle: string): Promise<void> {
    this._synthEngine!.deleteInstrument(instrumentHandle);
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

  async createWaveInstrument(
    instrumentId: string,
    instrumentBuff: ArrayBuffer,
    sampleRate: number,
    loopStart: number, loopLen: number,
    volume: number,
    entryEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<void> {
    if(!this._synthEngine) {
      throw Error("Node not conigured")
    }

    return this._synthEngine.registerInstrument(
      instrumentId,
      new ScriptSynthWaveInstrument(
        new Float32Array(instrumentBuff),
        sampleRate,
        loopStart, loopLen,
        volume, 
        entryEnvelopes,
        exitEnvelopes
        ));
  }

  async createFmInstrument(instrumentId: string, algorithm: FmInstrumentAlgorithmNodeDescriptor): Promise<void> {    
    this._synthEngine?.registerInstrument(instrumentId, 
      ScriptSynthFmInstrument.fromDescriptor(algorithm));
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

