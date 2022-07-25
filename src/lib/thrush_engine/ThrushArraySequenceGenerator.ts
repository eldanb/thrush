import { ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "./ThrushSequencer";

export class ThrushArraySequenceGenerator implements ThrushSequenceGenerator {
 _index: number = 0;

  constructor(private _sequence: ThrushSequenceEvent[]) {
  }

  start(sequencer: ThrushSequencer): void {
    this._index = 0;
  }

  nextEvent(): ThrushSequenceEvent | null {
    return this._index < this._sequence.length ? 
           this._sequence[this._index++] :
           null;    
  }
}