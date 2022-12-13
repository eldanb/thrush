import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerEventCommands, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { WaveFormGenerator, WaveFormGeneratorFactories } from "../common/WaveFormGenerators";
import { NativeSynthesizerInstrument } from "./NativeSynthesizerInstrument";

type NativeSynthesizerChannelState = {  
  channelInput: AudioNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;

  lastScheduledNoteId: string | null;
  channelBusyUntil: number;
  lastScheduledNode: AudioBufferSourceNode | null;
  lastRenderedNoteModulationTime: number;
  basePlaybackRate: number;
  vibratoGenerator: WaveFormGenerator | null;  
}

export class NativeSynthesizer implements ThrushCommonSynthesizerInterface {
  private _channelState: NativeSynthesizerChannelState[] = [];
  private _instruments: NativeSynthesizerInstrument[] = [];
  private _flushTimer: any;
  private _allScheduled = new Set<AudioNode>();

  private _noteEndedHandler = (ev: Event) => this._allScheduled.delete(ev.target as AudioNode);

  constructor(private _audioContext: AudioContext, numChannels: number) {    
    for(let i=0; i<numChannels; i++) {
      const gainNode = new GainNode(_audioContext);
      const panNode = new StereoPannerNode(_audioContext);
      panNode.connect(_audioContext.destination);
      gainNode.connect(panNode);
      this._channelState[i] = {
        lastScheduledNoteId: null,
        lastScheduledNode: null,
        channelBusyUntil: 0,
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

    this._allScheduled.forEach((n) => {
      n.disconnect();
    });
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
  
  private resolveChannelStateForEvent(synthEvent: ThrushCommonSynthesizerEvent): NativeSynthesizerChannelState {
    if(typeof(synthEvent.channelOrNoteId) === 'number') {
      return this._channelState[synthEvent.channelOrNoteId];
    } else {
      let channelState = this._channelState.find(channelState => channelState.lastScheduledNoteId === synthEvent.channelOrNoteId);
      if(channelState) {
        return channelState;
      }

      if(synthEvent.commands.newNote) {
        channelState = this._channelState.find(channelState => 
          channelState.channelBusyUntil == null ||
          (channelState.channelBusyUntil != -1  && channelState.channelBusyUntil <= synthEvent.time));

        if(!channelState) {
          channelState = this._channelState[0];
          console.warn("No free channel!");
        }

        channelState.lastScheduledNoteId = synthEvent.channelOrNoteId;

        return channelState;
      } else {
        console.warn("Note ID not found");
        return this._channelState[0];
      }      
    }
  }
  async enqueueSynthEvent(synthEvent: ThrushCommonSynthesizerEvent): Promise<void> {
    const channelState = this.resolveChannelStateForEvent(synthEvent);

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

      this._allScheduled.add(noteNode);
      noteNode.addEventListener("ended", this._noteEndedHandler);

      noteNode.start(synthEvent.time);
      noteNode.connect(channelState.channelInput);

      channelState.lastScheduledNode = noteNode;
      channelState.lastRenderedNoteModulationTime = 0;

      channelState.basePlaybackRate = playbackRate;   
      
      channelState.channelBusyUntil = -1;
    } else 
    if(synthEvent.commands.releaseNote) {
      channelState.channelBusyUntil = synthEvent.time;
      channelState.lastScheduledNode?.stop(synthEvent.time);
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
