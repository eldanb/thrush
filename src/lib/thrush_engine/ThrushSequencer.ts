import { NativeSynthesizer } from "./synth/native/NativeSynthesizer";
import { ScriptSynthesizer } from "./synth/scriptsynth/ScriptSynthesizer";
import { ThrushCursorTracker } from "./ThrushCursorTracker";

export abstract class ThrushSequenceEvent {
  time: number = 0;
  abstract clone(): ThrushSequenceEvent;
  abstract route(sequencer: ThrushSequencer) : Promise<void>;
}
export class ThrushSequenceMarkerEvent extends ThrushSequenceEvent {
  constructor(public override time: number, public cursorName?: string, public cursorValue?: any) {
    super();
  }

  clone(): ThrushSequenceEvent {
    return new ThrushSequenceMarkerEvent(this.time, this.cursorName, this.cursorValue);
  }

  async route(sequencer: ThrushSequencer) : Promise<void> {
    if(this.cursorName) { 
      sequencer.cursorTracker.postCusrorChangeEvent(this.time, this.cursorName, this.cursorValue);
    }
  }
}

export abstract class ThrushSequenceGenerator {
  abstract start(sequencer: ThrushSequencer): void;
  abstract nextEvent(): ThrushSequenceEvent | null;
}


export class ThrushSequencer {
  private _sequencerContext: ThrushSequenceGenerator | null = null;
  private _timerId: any = null;
  private _startTime: number = -1;
  private _lastBufferedEvent = -1;
  private _cursorTracker: ThrushCursorTracker;

  constructor(private _audioContext: AudioContext,
              private _tsynthToneGenerator: ScriptSynthesizer,
              private _waveSynth: NativeSynthesizer) {
    this._cursorTracker = new ThrushCursorTracker(_audioContext);
  }

  async start(sequencerData: ThrushSequenceGenerator): Promise<void> {
    if(this._sequencerContext) {
      await this.stop();
    }

    this._sequencerContext = sequencerData;
    this._sequencerContext.start(this);

    this._startTime = this._audioContext.currentTime;

    this.bufferEvents();
    this._timerId = setInterval(() => { this.bufferEvents() }, 100);
  }


  async stop() {
    if(!this._sequencerContext) {
      return;
    }

    clearInterval(this._timerId);
    this._sequencerContext = null;
    this._timerId = null;

    await this._tsynthToneGenerator.panic();
    await this._waveSynth.panic();
    this._cursorTracker.panic();
  }

  get tsynthToneGenerator() {
    return this._tsynthToneGenerator;
  }
  
  get waveTableSynthesizer() {
    return this._waveSynth;
  }

  get cursorTracker() {
    return this._cursorTracker;
  }
  
  private async bufferEvents() {
    while(this._lastBufferedEvent < this._audioContext.currentTime + 3) {
      const nextEvent = this._sequencerContext?.nextEvent();
      if(nextEvent) {
        nextEvent.time += this._startTime;
        await nextEvent.route(this);
        this._lastBufferedEvent = nextEvent.time;
      } else {
        break;
      }
    }
  }
}
