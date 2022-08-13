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

  concat(otherArray: ThrushArraySequenceGenerator, shiftTime: boolean = true): ThrushArraySequenceGenerator {
    const timeOffset = shiftTime 
      ?  this._sequence[this._sequence.length-1].time
      : 0;

    if(this._sequence[this._sequence.length-1] instanceof ThrushSequenceEndEvent) {
      this._sequence.pop();
    }
    
    const appendedArray = otherArray._sequence.map(event => {
      const shiftedEvent = event.clone();
      shiftedEvent.time += timeOffset;
      return shiftedEvent;
    });

    return new ThrushArraySequenceGenerator(this._sequence.concat(appendedArray));
  }
}