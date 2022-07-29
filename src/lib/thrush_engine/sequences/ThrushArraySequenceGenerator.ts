import { ThrushSequenceEndEvent, ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "../ThrushSequencer";

export class ThrushArraySequenceGenerator implements ThrushSequenceGenerator {
 _index: number = 0;

  constructor(private _sequence: ThrushSequenceEvent[]) {
  }

  start(sequencer: ThrushSequencer): void {
    this._index = 0;
  }

  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {
      
  }
  
  nextEvent(): ThrushSequenceEvent | null {
    return this._index < this._sequence.length ? 
           this._sequence[this._index++] :
           new ThrushSequenceEndEvent(this._sequence[this._sequence.length-1].time);    
  }
}