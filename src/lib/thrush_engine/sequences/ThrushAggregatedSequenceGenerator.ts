import { ThrushSequenceGenerator, ThrushSequenceEvent, ThrushSequencer, ThrushSequenceEndEvent } from "../ThrushSequencer";

export class ThrushAggregatedSequenceGenerator extends ThrushSequenceGenerator {  
  private _sequencer: ThrushSequencer | null = null;

  constructor(...sequences: ThrushSequenceGenerator[]) {
    super();
    this._cachedNextEvent = [];    
    this._initialChildSequences = sequences;
    this._aggregatedSequences = [];
  }

  private _initialChildSequences: ThrushSequenceGenerator[];
  private _aggregatedSequences: ThrushSequenceGenerator[];  
  private _cachedNextEvent: (ThrushSequenceEvent | null)[];
  private _lastEndEventTime: number = 0;

  addInitialChild(childSequence: ThrushSequenceGenerator) {
    this._initialChildSequences.push(childSequence);
  }

  addChild(childSequence: ThrushSequenceGenerator) {
    this._aggregatedSequences.push(childSequence);
    childSequence.start(this._sequencer!);
  }

  start(sequencer: ThrushSequencer): void {
    this._sequencer = sequencer;
    this._aggregatedSequences = this._initialChildSequences.concat();
    this._aggregatedSequences.forEach((c) => c.start(sequencer));
  }

  nextEvent(): ThrushSequenceEvent | null {
    let childIndex = 0;
    let selectedEvent: ThrushSequenceEvent | null = null;
    let selectedEventChildIndex: number | null = null;

    if(this._aggregatedSequences.length == 0) {
      return new ThrushSequenceEndEvent(this._lastEndEventTime);
    }

    while(childIndex < this._aggregatedSequences.length) {
      const childSequence = this._aggregatedSequences[childIndex];

      let nextEventForChild: ThrushSequenceEvent | null = null;
      if(this._cachedNextEvent[childIndex] == null) {        
        nextEventForChild = childSequence.nextEvent();

        if(nextEventForChild instanceof ThrushSequenceEndEvent) {          
          this._cachedNextEvent.splice(childIndex, 1);
          this._aggregatedSequences.splice(childIndex, 1);

          if(nextEventForChild.time > this._lastEndEventTime) {
            this._lastEndEventTime = nextEventForChild.time;
          } 
          continue;
        }

        this._cachedNextEvent[childIndex] = nextEventForChild;
      } else {
        nextEventForChild = this._cachedNextEvent[childIndex];
      }

      if(nextEventForChild && (!selectedEvent || nextEventForChild.time < selectedEvent.time)) {
        selectedEvent = nextEventForChild;
        selectedEventChildIndex = childIndex;  
      }

      childIndex++;
    }
    
    if(selectedEventChildIndex !== null) {
      this._cachedNextEvent[selectedEventChildIndex] = null;      
    } 

    return selectedEvent;
  }

  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {
      this._aggregatedSequences.forEach((sequence) => {
        sequence.postEvent(time, eventType, eventTarget, value);
      })
  }
}
