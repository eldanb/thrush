import { ThrushSequenceGenerator, ThrushSequenceEvent, ThrushSequencer, ThrushSequenceEndEvent } from "./ThrushSequencer";

export class ThrushAggregatedSequenceGenerator extends ThrushSequenceGenerator {  
  private _sequencer: ThrushSequencer | null = null;

  constructor(...contexts: ThrushSequenceGenerator[]) {
    super();
    this._cachedNextEvent = [];
    this._aggregatedContexts = contexts;
  }

  private _aggregatedContexts: ThrushSequenceGenerator[];
  private _cachedNextEvent: (ThrushSequenceEvent | null)[];
  private _lastTime: number = 0;

  addChild(childSequencerContext: ThrushSequenceGenerator) {
    this._aggregatedContexts.push(childSequencerContext);
    if(this._sequencer) {
      childSequencerContext.start(this._sequencer);
    }
  }

  start(sequencer: ThrushSequencer): void {
    this._sequencer = sequencer;
    this._aggregatedContexts.forEach((c) => c.start(sequencer));
  }

  nextEvent(): ThrushSequenceEvent | null {
    let childIndex = 0;
    let selectedEvent: ThrushSequenceEvent | null = null;
    let selectedEventChildIndex: number | null = null;

    if(this._aggregatedContexts.length == 0) {
      return new ThrushSequenceEndEvent(this._lastTime);
    }

    while(childIndex < this._aggregatedContexts.length) {
      const childContext = this._aggregatedContexts[childIndex];

      let nextEventForChild: ThrushSequenceEvent | null = null;
      if(this._cachedNextEvent[childIndex] == null) {        
        nextEventForChild = childContext.nextEvent();

        if(nextEventForChild instanceof ThrushSequenceEndEvent) {          
          this._cachedNextEvent.splice(childIndex, 1);
          this._aggregatedContexts.splice(childIndex, 1);
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
      this._lastTime = selectedEvent!.time;
    }

    return selectedEvent;
  }
}
