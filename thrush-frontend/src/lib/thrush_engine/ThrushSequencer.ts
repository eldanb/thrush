import { NativeSynthesizer } from "./synth/native/NativeSynthesizer";
import { ScriptSynthesizer } from "./synth/scriptsynth/ScriptSynthesizer";
import { ThrushCursorTracker } from "./ThrushCursorTracker";
import { ThrushEventBus } from "./ThrushEventBus";

export abstract class ThrushSequenceEvent {
  time: number = 0;

  abstract clone(): ThrushSequenceEvent;
  abstract route(sequencer: ThrushSequencer) : Promise<void>;
}

export class ThrushSequenceEndEvent extends ThrushSequenceEvent{
  constructor(public override time: number) {
    super();
  }

  clone(): ThrushSequenceEvent {
    return new ThrushSequenceEndEvent(this.time);
  }
  
  route(sequencer: ThrushSequencer) : Promise<void> {
    return Promise.reject();
  }
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
  abstract postEvent(time: number, eventType: string, eventTarget: string, value: any): void;
  abstract nextEvent(): ThrushSequenceEvent | null;
}


export class ThrushSequencer implements ThrushEventBus {
  private _sequence: ThrushSequenceGenerator | null = null;
  private _timerId: any = null;
  private _startTime: number = -1;
  private _lastBufferedEvent = -1;
  private _cursorTracker: ThrushCursorTracker;
  private _routing: boolean = false;
  
  constructor(private _audioContext: AudioContext,
              private _tsynthToneGenerator: ScriptSynthesizer,
              private _waveSynth: NativeSynthesizer) {
    
    this._cursorTracker = new ThrushCursorTracker(this, _audioContext);
  }

  async start(sequencerData: ThrushSequenceGenerator): Promise<void> {
    if(this._sequence) {
      await this.stop();
    }

    this._sequence = sequencerData;
    this._sequence.start(this);

    this._startTime = this._audioContext.currentTime;

    this.bufferEvents();
    this._timerId = setInterval(() => { this.bufferEvents() }, 100);
  }


  async stop() {
    if(!this._sequence) {
      return;
    }

    clearInterval(this._timerId);
    this._sequence = null;
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
  
  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {
    if(!this._routing) {
      throw new Error('Events can only be posted when routing');
    }    

    this._sequence?.postEvent(time - this._startTime, eventType, eventTarget, value);
  }

  private async bufferEvents() {
    while(this._lastBufferedEvent < this._audioContext.currentTime + 3) {
      const nextEvent = this._sequence?.nextEvent();
      if(!nextEvent || nextEvent instanceof ThrushSequenceEndEvent) {
        break;
      }
      
      nextEvent.time += this._startTime;      
      this._routing = true;
      await nextEvent.route(this);
      this._routing = false;
      this._lastBufferedEvent = nextEvent.time;
    }
  }
}
