import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { NativeSynthesizerInstrument } from "./NativeSynthesizerInstrument";

type NativeSynthesizerChannelState = {
  channelInput: AudioNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  lastScheduledNode: AudioBufferSourceNode | null;
}
export class NativeSynthesizer implements ThrushCommonSynthesizerInterface {
  private _channelState: NativeSynthesizerChannelState[] = [];
  private _instruments: NativeSynthesizerInstrument[] = [];

  constructor(private _audioContext: AudioContext, numChannels: number) {    
    for(let i=0; i<numChannels; i++) {
      const gainNode = new GainNode(_audioContext);
      const panNode = new StereoPannerNode(_audioContext);
      panNode.connect(_audioContext.destination);
      gainNode.connect(panNode);
      this._channelState[i] = {
        lastScheduledNode: null,
        gainNode,
        panNode,
        channelInput: gainNode        
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
    const channelState = this._channelState[synthEvent.channel];
    const lastScheduled = channelState.lastScheduledNode;
    if(lastScheduled) {
      lastScheduled.stop(synthEvent.time);
    }

    // TODO vibrato
    if(synthEvent.commands.newNote) {
      const instrument = this._instruments[synthEvent.commands.newNote?.instrumentId];      
      const noteNode = new AudioBufferSourceNode(
        this._audioContext, 
        { 
          buffer: instrument.getAudioBuffer(1), 
          playbackRate: Math.pow(2, (synthEvent.commands.newNote.note/12))
        });
      
      if(instrument.sampleLoopLen) {
        noteNode.loop = !!instrument.sampleLoopLen;
        noteNode.loopStart = (instrument.sampleLoopStart / instrument.sampleRate);
        noteNode.loopEnd = (instrument.sampleLoopLen + instrument.sampleLoopStart) / instrument.sampleRate;
      }

      noteNode.start(synthEvent.time);
      noteNode.connect(channelState.channelInput);
      channelState.lastScheduledNode = noteNode;  
    }
    
    if(synthEvent.commands.volume != null) {
      channelState.gainNode.gain.setValueAtTime(synthEvent.commands.volume, synthEvent.time);
    }

    if(synthEvent.commands.panning != null) {
      channelState.panNode.pan.setValueAtTime(synthEvent.commands.panning, synthEvent.time);
    }
      
  }    
}
