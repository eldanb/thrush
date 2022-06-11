import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { NativeSynthesizerInstrument } from "./NativeSynthesizerInstrument";

type NativeSynthesizerChannelState = {
  lastScheduledNode: AudioBufferSourceNode | null;
}
export class NativeSynthesizer implements ThrushCommonSynthesizerInterface {
  private _channelState: NativeSynthesizerChannelState[] = [];
  private _instruments: NativeSynthesizerInstrument[] = [];

  constructor(private _audioContext: AudioContext, numChannels: number) {    
    for(let i=0; i<numChannels; i++) {
      this._channelState[i] = {
        lastScheduledNode: null
      }
    }
  }
  
  async panic(): Promise<void> {    
  }

  
  registerInstrument(
    sampleBuff: ArrayBuffer, 
    sampleRate: number, 
    sampleStart: number, 
    loopStart: number, 
    loopLen: number, 
    volume: number): number {

    return this._instruments.push(
      new NativeSynthesizerInstrument(new Float32Array(sampleBuff), sampleRate, loopStart, loopLen)
    ) - 1;
  }
  
  
  async enqueueSynthEvent(synthEvent: ThrushCommonSynthesizerEvent): Promise<void> {
    const lastScheduled = this._channelState[synthEvent.channel].lastScheduledNode;
    if(lastScheduled) {
      lastScheduled.stop(synthEvent.time);
    }

    // TODO time, vibrato, volume change, ...
    if(synthEvent.commands.newNote) {
      const audioBuffer = this._instruments[synthEvent.commands.newNote?.instrumentId].getAudioBuffer(1);
      const noteNode = new AudioBufferSourceNode(this._audioContext, { buffer: audioBuffer, playbackRate: Math.pow(2, (synthEvent.commands.newNote.note/12))});
      noteNode.start(synthEvent.time);
      noteNode.connect(this._audioContext.destination);
      this._channelState[synthEvent.channel].lastScheduledNode = noteNode;  
    }
  }    
}
