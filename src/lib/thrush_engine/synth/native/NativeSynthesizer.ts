import { NativeSynthesizerInstrument } from "./NativeSynthesizerInstrument";

type NativeSynthesizerChannelState = {
  lastScheduledNode: AudioBufferSourceNode | null;
}

export class NativeSynthesizer {
  private _channelState: NativeSynthesizerChannelState[];

  constructor(private _audioContext: AudioContext, numChannels: number) {
    this._channelState = [];
    for(let i=0; i<numChannels; i++) {
      this._channelState[i] = {
        lastScheduledNode: null
      }
    }
  }


  public scheduleNote(time: number, channel: number, note: number, instrument: NativeSynthesizerInstrument) {
    const lastScheduled = this._channelState[channel].lastScheduledNode;
    if(lastScheduled) {
      lastScheduled.stop(time);
    }

    // TODO time
    const audioBuffer = instrument.getAudioBuffer(1);
    const noteNode = new AudioBufferSourceNode(this._audioContext, { buffer: audioBuffer, playbackRate: Math.pow(2, (note/12))});
    noteNode.start(time);
    noteNode.connect(this._audioContext.destination);
    this._channelState[channel].lastScheduledNode = noteNode;
  }
}
