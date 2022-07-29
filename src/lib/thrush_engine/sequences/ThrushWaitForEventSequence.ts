import { ThrushSequenceEndEvent, ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "../ThrushSequencer";

export class ThrushWaitForEventSequence extends ThrushSequenceGenerator {
  _satisfiedTime: number | null = null;

  constructor(private _since: number, private _eventType: string, private _eventTarget?: string) {
    super();
  }

  start(sequencer: ThrushSequencer): void {    
  }

  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {    
    if(time < this._since) {
      return;
    }

    if(eventType === this._eventType && (!this._eventTarget || eventTarget === this._eventTarget)) {
      if(this._satisfiedTime === null || this._satisfiedTime > time) {
        this._satisfiedTime = time;
      }
    }
  }

  nextEvent(): ThrushSequenceEvent | null {
    if(this._satisfiedTime === null) {
      return null;
    }

    return new ThrushSequenceEndEvent(this._satisfiedTime);
  }
  
}