

export type EnvelopeCurveCoordinate = { 
  time: number;
  value: number;
}

export class EnvelopeCurveState {
  constructor(
    private _envelope: EnvelopeCurveCoordinate[], 
    private _epochStartValue: number,    
    private _epochSample: number, 
    private _sampleRate: number,
    ) {
      this.rewind();    
  }

  rewind() {
    this._curveIndex = 0;

    this._startValue = this._epochStartValue;
    this._endValue = this._envelope[0].value;
    this.currentValue = -1;
    this._delta = this._endValue - this._startValue;
    
    this._startSample = this._epochSample;
    this._endSample = this._epochSample + this._envelope[0].time * this._sampleRate;
    this._durationSamples = this._endSample - this._startSample;
    
    this.running = true;
  }

  updateEnvelopeState(currentSample: number) {
    if(!this.running) return;

    // Page to next curve segment?
    if(this._endSample <= currentSample) {
      let running = true;
      let currentEnvelopeCurveIndex = this._curveIndex;
      let currentEndSample = this._endSample;
      let currentEndValue = this._endValue;
  
      while(currentEndSample <= currentSample) {
        if(currentEnvelopeCurveIndex >= this._envelope.length-1) {
          running = false;
          break;
        }
  
        currentEnvelopeCurveIndex++;
  
        const currentCurve = this._envelope[currentEnvelopeCurveIndex];
        currentEndSample = currentCurve.time * this._sampleRate + this._epochSample;
        currentEndValue = currentCurve.value;
      }
  
      if(running) {
        const previousCurve = this._envelope[currentEnvelopeCurveIndex-1];
  
        this._startValue = previousCurve.value;
        this._startSample = previousCurve.time * this._sampleRate 
          + this._epochSample;
  
        this._endValue = this._envelope[currentEnvelopeCurveIndex].value;
        this._endSample = currentEndSample;
  
        this._delta = this._endValue - this._startValue;
        this._durationSamples = this._endSample - this._startSample;
  
        this._curveIndex = currentEnvelopeCurveIndex;        
      } else {
        this.currentValue = currentEndValue;
        this.running = false;
      }
    }
  
    if(this.running) {
      this.currentValue = this._startValue + 
      this._delta * 
        (currentSample - this._startSample)/this._durationSamples;
    }
  }

  public running: boolean = true;
  public currentValue: number = 0;
  
  private _curveIndex: number = 0;  
  private _startValue: number = 0;
  private _endValue: number = 0;
  private _delta: number = 0;

  private _startSample: number = 0;
  private _endSample: number = 0; 
  private _durationSamples: number = 0;
};