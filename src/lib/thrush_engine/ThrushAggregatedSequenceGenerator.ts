import { ThrushSequenceGenerator, ThrushSequenceEvent, ThrushSequencer } from "./ThrushSequencer";

export class ThrushAggregatedSequenceGenerator extends ThrushSequenceGenerator {
  constructor() {
    super();
    this._cachedNextEvent = [];
  }

  private _aggregatedContexts: ThrushSequenceGenerator[] = [];
  private _cachedNextEvent: (ThrushSequenceEvent | null | false)[];

  addChild(childSequencerContext: ThrushSequenceGenerator) {
    this._aggregatedContexts.push(childSequencerContext);
  }

  start(sequencer: ThrushSequencer): void {
    this._aggregatedContexts.forEach((c) => c.start(sequencer));
  }

  nextEvent(): ThrushSequenceEvent | null {
    const peekedEvents = this._aggregatedContexts.map((childContext, index) => {
      if(this._cachedNextEvent[index] == null) {
        const nextEventForChild = childContext.nextEvent();
        if(nextEventForChild == null) {
          this._cachedNextEvent[index] = false;
        } else {
          this._cachedNextEvent[index] = nextEventForChild;
        }
      }

      return this._cachedNextEvent[index];
    });

    let selectedEvent: ThrushSequenceEvent | null = null;
    let selectedEventChildIndex: number | null = null;

    peekedEvents.forEach((event, index) => {
      if(event) {
        if(!selectedEvent ||
            event.time < selectedEvent.time) {
            selectedEvent = event;
            selectedEventChildIndex = index;
        }
      }
    });

    if(selectedEventChildIndex !== null) {
      this._cachedNextEvent[selectedEventChildIndex] = null;
    }

    return selectedEvent;
  }
}
