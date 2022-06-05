import { createMessagePortRpcProxy } from "src/lib/util/MessagePortRpc";
import { ScriptSynthWorkerRpcInterface } from "./worklet/ScriptSynthWorkerRpcInterface";


export class ScriptSynthesizer {
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

  get synthInterface(): ScriptSynthWorkerRpcInterface {
    return this._workletNodeRpcProxy;
  }
}
