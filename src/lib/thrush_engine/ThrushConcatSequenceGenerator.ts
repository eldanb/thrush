import { ThrushSequenceEvent, ThrushSequenceGenerator, ThrushSequencer } from "./ThrushSequencer";

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
  }

  nextEvent(): ThrushSequenceEvent | null {
    let ret: ThrushSequenceEvent | null = null;

    while(this._currentAggIndex < this._aggregatedContexts.length) {
      ret = this._aggregatedContexts[this._currentAggIndex].nextEvent();
      if(ret) {
        ret.time += this._timeOfs;
        this._lastTime = ret.time;
        return ret;
      } else {
        this._timeOfs = this._lastTime;
        this._currentAggIndex ++;      
      }
    }

    return null;
  }
}