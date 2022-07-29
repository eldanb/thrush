import { ThrushSequenceEndEvent, ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "../ThrushSequencer";

export class ThrushConcatSequenceGenerator extends ThrushSequenceGenerator {
  
  private _currentAggIndex: number = 0; 
  private _timeOfs: number = 0;
  private _lastTime: number = 0;

  constructor(private _aggregatedContexts: ThrushSequenceGenerator[] = []) {
    super();
  }

  addChild(childSequencerContext: ThrushSequenceGenerator) {
    this._aggregatedContexts.push(childSequencerContext);
  }

  start(sequencer: ThrushSequencer): void {
    this._aggregatedContexts.forEach((c) => c.start(sequencer));
    this._currentAggIndex = 0; 
    this._timeOfs = 0;
    this._lastTime = 0;
  }

  nextEvent(): ThrushSequenceEvent | null {
    let ret: ThrushSequenceEvent | null = null;

    while(this._currentAggIndex < this._aggregatedContexts.length) {
      ret = this._aggregatedContexts[this._currentAggIndex].nextEvent()?.clone() || null;
      if(ret) {
        if(ret instanceof ThrushSequenceEndEvent) {
          this._timeOfs = this._lastTime;
          this._currentAggIndex ++;
        } else {
          ret.time += this._timeOfs;
          this._lastTime = ret.time;        
          return ret;
        }
      } 
    }

    return new ThrushSequenceEndEvent(this._lastTime);
  }

  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {
    this._aggregatedContexts[this._currentAggIndex]?.postEvent(
      time - this._timeOfs,
      eventType, eventTarget, value);    
  }
}