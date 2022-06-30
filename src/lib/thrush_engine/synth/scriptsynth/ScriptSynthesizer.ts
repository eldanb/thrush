import { createMessagePortRpcProxy } from "src/lib/util/MessagePortRpc";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { ScriptSynthWorkerRpcInterface } from "./worklet/ScriptSynthWorkerRpcInterface";


export class ScriptSynthesizer implements ThrushCommonSynthesizerInterface {
  private _audioContext: AudioContext;
  private _workletNode: AudioWorkletNode;
  private _workletNodeRpcProxy: ScriptSynthWorkerRpcInterface;

  constructor(audioContext: AudioContext, numChannels: number) {
    this._audioContext = audioContext;

    this._audioContext = audioContext;

    this._workletNode = new AudioWorkletNode(this._audioContext, 'scriptsynth-audio-worker', {
      outputChannelCount: [2]
    });

    this._workletNodeRpcProxy = createMessagePortRpcProxy<ScriptSynthWorkerRpcInterface>(this._workletNode.port);
  }

  static async loadModuleToContext(audioContext: AudioContext): Promise<void> {
    const filename = 'assets/scriptsynth-audio-worklet.js';
    console.log("Will load worklet form " + filename)
    await audioContext.audioWorklet.addModule(filename);
  }

  get audioNode(): AudioNode {
    return this._workletNode;
  }

  panic() {
    return this._workletNodeRpcProxy.clearEventQueue();
  }

  initialize(): Promise<void> {
    return this._workletNodeRpcProxy.configure(this._audioContext.sampleRate);
  }

  createInstrument(instrument: ArrayBuffer,
    sampleRate: number,
    sampleStart: number,
    loopStart: number, 
    loopLen: number,
    volume: number): Promise<number> {
      return this._workletNodeRpcProxy.createInstrument(
        instrument, 
        sampleRate, 
        sampleStart, 
        loopStart,
        loopLen, 
        volume);
  }

  async enqueueSynthEvent(synthEvent: ThrushCommonSynthesizerEvent): Promise<void> {
    await this._workletNodeRpcProxy.enqueueEvent({
      time: synthEvent.time,
      channel: synthEvent.channel,
      newNote: synthEvent.commands.newNote,
      panning: synthEvent.commands.panning,
      volume: synthEvent.commands.volume,
      vibrato: synthEvent.commands.vibrato
    });
  }


}
