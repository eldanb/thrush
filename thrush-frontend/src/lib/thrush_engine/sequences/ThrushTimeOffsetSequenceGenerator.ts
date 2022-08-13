import { ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "../ThrushSequencer";


export class ThrushTimeOffsetSequenceGenerator extends ThrushSequenceGenerator {
  constructor(private _underlying: ThrushSequenceGenerator, private _timeOffset: number) {
    super();
  }

  start(sequencer: ThrushSequencer): void {
    this._underlying.start(sequencer);
  }
  
  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {
    this._underlying.postEvent(time - this._timeOffset, eventType, eventTarget, value);
  }

  nextEvent(): ThrushSequenceEvent | null {
    const underlyingEvent = this._underlying.nextEvent()?.clone() || null;
    if(underlyingEvent) {
      underlyingEvent.time += this._timeOffset;
    }

    return underlyingEvent;
  }
}