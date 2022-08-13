import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { WaveFormGenerator, WaveFormGeneratorFactories } from "../common/WaveFormGenerators";
import { NativeSynthesizerInstrument } from "./NativeSynthesizerInstrument";

type NativeSynthesizerChannelState = {
  channelInput: AudioNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
    

  lastScheduledNode: AudioBufferSourceNode | null;
  lastRenderedNoteModulationTime: number;
  basePlaybackRate: number;
  vibratoGenerator: WaveFormGenerator | null;  
}

export class NativeSynthesizer implements ThrushCommonSynthesizerInterface {
  private _channelState: NativeSynthesizerChannelState[] = [];
  private _instruments: NativeSynthesizerInstrument[] = [];
  private _flushTimer: any;

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
        channelInput: gainNode,
        lastRenderedNoteModulationTime: 0, 
        basePlaybackRate: 0,
        vibratoGenerator: null
      }
    }

    this._flushTimer = setInterval(() => {
      const tm = this._audioContext.currentTime + 2;
      this._channelState.forEach(channelState => this.renderChannelNoteModulationEvents(channelState, tm));
    }, 100);
  }
  
  async panic(): Promise<void> { 
    this._channelState.forEach((channelState) => {      
      this.clearChannelNoteModulation(channelState, 0);
      channelState.lastScheduledNode?.disconnect();
      channelState.lastScheduledNode = null;      
    })
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

    this.renderChannelNoteModulationEvents(channelState, synthEvent.time);

    let flushNoteModulationNeeded = false;
    
    if(synthEvent.commands.newNote) {
      const instrument = this._instruments[synthEvent.commands.newNote?.instrumentId]; 
      const playbackRate = Math.pow(2, (synthEvent.commands.newNote.note/12))     
      const noteNode = new AudioBufferSourceNode(
        this._audioContext, 
        { 
          buffer: instrument.getAudioBuffer(1), 
          playbackRate: playbackRate,
        });
      
      if(instrument.sampleLoopLen) {
        noteNode.loop = !!instrument.sampleLoopLen;
        noteNode.loopStart = (instrument.sampleLoopStart / instrument.sampleRate);
        noteNode.loopEnd = (instrument.sampleLoopLen + instrument.sampleLoopStart) / instrument.sampleRate;
      }

      noteNode.start(synthEvent.time);
      noteNode.connect(channelState.channelInput);

      channelState.lastScheduledNode = noteNode;
      channelState.lastRenderedNoteModulationTime = 0;

      channelState.basePlaybackRate = playbackRate;      
    }
    
    if(synthEvent.commands.volume != null) {
      channelState.gainNode.gain.setValueAtTime(synthEvent.commands.volume, synthEvent.time);
    }

    if(synthEvent.commands.panning != null) {
      channelState.panNode.pan.setValueAtTime(synthEvent.commands.panning, synthEvent.time);
    }    

    if(synthEvent.commands.vibrato) {
      flushNoteModulationNeeded = true;

      channelState.vibratoGenerator = 
        synthEvent.commands.vibrato.waveform === "none"
        ? null
        : channelState.vibratoGenerator = WaveFormGeneratorFactories[synthEvent.commands.vibrato.waveform](
          synthEvent.time,
          synthEvent.commands.vibrato.amplitude,
          synthEvent.commands.vibrato.frequency
        );
    }

    if(flushNoteModulationNeeded) {
      this.clearChannelNoteModulation(channelState, synthEvent.time);
    }

    this.renderChannelNoteModulationEvents(channelState, synthEvent.time + 100);
  }  
  
  
  clearChannelNoteModulation(channelState: NativeSynthesizerChannelState, startingAtTime: number) {
    if(startingAtTime <= channelState.lastRenderedNoteModulationTime) {
      channelState.lastRenderedNoteModulationTime = startingAtTime;    
      channelState.lastScheduledNode?.playbackRate.cancelAndHoldAtTime(startingAtTime);
    }
  }

  renderChannelNoteModulationEvents(channelState: NativeSynthesizerChannelState, targetTime: number) {    
    while(channelState.lastRenderedNoteModulationTime < targetTime) {
      channelState.lastRenderedNoteModulationTime += 1/50;      
      if(channelState.vibratoGenerator) {
        channelState.lastScheduledNode?.playbackRate.setValueAtTime(
          (1 + channelState.vibratoGenerator(channelState.lastRenderedNoteModulationTime)) *
            channelState.basePlaybackRate,
          channelState.lastRenderedNoteModulationTime);
      }
    }

    channelState.lastRenderedNoteModulationTime = targetTime;
  }
  
}
