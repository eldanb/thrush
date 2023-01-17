import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerEventCommands, ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { EnvelopeCurveState } from "../common/Envelopes";
import { WaveFormGenerator, WaveFormGeneratorFactories } from "../common/WaveFormGenerators";
import { Envelopes, NativeSynthesizerInstrument } from "./NativeSynthesizerInstrument";

const ENVELOPE_SAMPLES_HZ = 200;


type EnvelopeState = {
  [envelope in keyof Envelopes]: EnvelopeCurveState;
}


class NativeSynthesizerChannelState {
  constructor( 
    public channelInput: AudioNode,
    public gainNode: GainNode,
    public panNode: StereoPannerNode
  ) {
  
  }

  public startEnvelope(envelopes: Envelopes | undefined, startFromCurrent: boolean, epochTime: number) {
    this.envelopeState = envelopes && {
      volume: envelopes.volume && 
        new EnvelopeCurveState(envelopes.volume, 
          startFromCurrent ? this.envelopeState!.volume.currentValue : 0, 
          epochTime * ENVELOPE_SAMPLES_HZ, ENVELOPE_SAMPLES_HZ)      
    }

    this.envelopeStateEpochTime = epochTime;
  }
  
  lastScheduledNoteId: string | null = null;
  channelBusyUntil: number = 0;
  lastScheduledNode: AudioBufferSourceNode | null = null;
  lastScheduledInstrment: NativeSynthesizerInstrument | undefined;
  lastRenderedNoteModulationTime: number = 0;
  basePlaybackRate: number = 0;
  baseVolume: number = 1;

  envelopeState: EnvelopeState | undefined;
  envelopeStateEpochTime: number | undefined;

  vibratoGenerator: WaveFormGenerator | null = null;  
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
      this._channelState[i] = new NativeSynthesizerChannelState(gainNode, gainNode, panNode);        
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
      channelState.envelopeState = undefined;
      channelState.lastScheduledNoteId = null;
      channelState.channelBusyUntil = 0;
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
      new NativeSynthesizerInstrument(new Float32Array(sampleBuff), sampleRate, loopStart, loopLen,
      {
        volume: [
          {
            time: 0.1,
            value: 1
          },
          {
            time: 0.2,
            value: 0.5
          },
          {
            time: 0.3,
            value: 0.9
          },
        ]
      },
      {
        volume: [
          { 
            time: 1,
            value: 0
          }
        ]
      })
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

      channelState.startEnvelope(instrument.enterEnvelopes, false, synthEvent.time);

      this._allScheduled.add(noteNode);
      noteNode.addEventListener("ended", this._noteEndedHandler);

      noteNode.start(synthEvent.time);
      noteNode.connect(channelState.channelInput);

      channelState.lastScheduledNode = noteNode;
      channelState.lastRenderedNoteModulationTime = synthEvent.time - 1/ENVELOPE_SAMPLES_HZ;
      channelState.lastScheduledInstrment = instrument;

      channelState.basePlaybackRate = playbackRate;   
      
      channelState.channelBusyUntil = -1;
    } else 
    if(synthEvent.commands.releaseNote) {
      channelState.startEnvelope(channelState.lastScheduledInstrment?.exitEnvelopes, true, synthEvent.time);
      channelState.channelBusyUntil = channelState.lastScheduledInstrment?.exitEnvelopes ? synthEvent.time + 5 : synthEvent.time;
      channelState.lastScheduledNode?.stop(channelState.channelBusyUntil);
    }
    
    if(synthEvent.commands.volume != null) {
      channelState.baseVolume = synthEvent.commands.volume;
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

    this.renderChannelNoteModulationEvents(channelState, synthEvent.time + 5);
  }  
  
  
  clearChannelNoteModulation(channelState: NativeSynthesizerChannelState, startingAtTime: number) {
    if(startingAtTime <= channelState.lastRenderedNoteModulationTime) {
      channelState.lastRenderedNoteModulationTime = startingAtTime;    
      channelState.lastScheduledNode?.playbackRate.cancelAndHoldAtTime(startingAtTime);
      channelState.gainNode.gain.cancelAndHoldAtTime(startingAtTime);
      
      channelState.envelopeState?.volume?.rewind();
    }
  }

  renderChannelNoteModulationEvents(channelState: NativeSynthesizerChannelState, targetTime: number) {  
    let currentRenderTime = channelState.lastRenderedNoteModulationTime;
    let envelopeSample = channelState.lastRenderedNoteModulationTime * ENVELOPE_SAMPLES_HZ;
    while(currentRenderTime < targetTime) {
      currentRenderTime += 1/ENVELOPE_SAMPLES_HZ;
      envelopeSample++;

      const volumeEnvelope = channelState.envelopeState?.volume;
      if(volumeEnvelope) {
        volumeEnvelope.updateEnvelopeState(envelopeSample);
        if(volumeEnvelope.running) { 
          channelState.gainNode.gain.setValueAtTime(
            volumeEnvelope.currentValue * channelState.baseVolume,
            currentRenderTime);
        }
      }

      if(channelState.vibratoGenerator) {
        channelState.lastScheduledNode?.playbackRate.setValueAtTime(
          (1 + channelState.vibratoGenerator(currentRenderTime)) *
            channelState.basePlaybackRate,
            currentRenderTime);
      }
    }

    channelState.lastRenderedNoteModulationTime = targetTime;    
  }
  
  async executeImmediateCommand(immediateChannelCommand: ThrushCommonSynthesizerEventCommands): Promise<number> {
    const targetTime = this._audioContext.currentTime;
    await this.enqueueSynthEvent(new ThrushCommonSynthesizerEvent(targetTime, this, '$$immediate', immediateChannelCommand));
    return targetTime;
  }
}