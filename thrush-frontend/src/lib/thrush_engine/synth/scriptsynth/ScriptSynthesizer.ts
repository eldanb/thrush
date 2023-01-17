import { createMessagePortRpcProxy } from "src/lib/util/MessagePortRpc";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerEventCommands, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { Envelopes } from "./ScriptSynthInstrument";
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
    return this._workletNodeRpcProxy.panic();
  }

  initialize(): Promise<void> {
    return this._workletNodeRpcProxy.configure(this._audioContext.sampleRate);
  }

  createInstrument(instrument: ArrayBuffer,
    sampleRate: number,    
    loopStart: number, 
    loopLen: number,
    volume: number,
    entryEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<number> {
      return this._workletNodeRpcProxy.createInstrument(
        instrument, 
        sampleRate,
        loopStart,
        loopLen, 
        volume,
        entryEnvelopes,
        exitEnvelopes);
  }

  updateInstrument(instrumentHandle: number, 
    instrument: ArrayBuffer,
    sampleRate: number,    
    loopStart: number, 
    loopLen: number,
    volume: number,
    entryEnvelopes?: Envelopes,
    exitEnvelopes?: Envelopes): Promise<void> {
      return this._workletNodeRpcProxy.updateInstrument(
        instrumentHandle,
        instrument, 
        sampleRate,
        loopStart,
        loopLen, 
        volume,
        entryEnvelopes,
        exitEnvelopes);
  }

  deleteInstrument(instrumentHandle: number) {
    this._workletNodeRpcProxy.deleteInstrument(
      instrumentHandle);      
  }


  async enqueueSynthEvent(synthEvent: ThrushCommonSynthesizerEvent): Promise<void> {
    await this._workletNodeRpcProxy.enqueueEvent({
      time: synthEvent.time,
      channelOrNoteId: synthEvent.channelOrNoteId,
      newNote: synthEvent.commands.newNote,
      releaseNote: synthEvent.commands.releaseNote,
      panning: synthEvent.commands.panning,
      volume: synthEvent.commands.volume,
      vibrato: synthEvent.commands.vibrato
    });
  }

  async executeImmediateCommand(immediateChannelCommand: ThrushCommonSynthesizerEventCommands): Promise<number> {
    return await this._workletNodeRpcProxy.executeImmediateCommand(
      {
        newNote: immediateChannelCommand.newNote,
        releaseNote: immediateChannelCommand.releaseNote,
        panning: immediateChannelCommand.panning,
        volume: immediateChannelCommand.volume,
        vibrato: immediateChannelCommand.vibrato
      })
  }


}
