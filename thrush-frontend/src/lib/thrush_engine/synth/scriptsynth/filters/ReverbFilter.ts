import { IScriptSynthInstrumentFilter } from "../ScriptSynthInstrument";

export class ReverbFilter implements IScriptSynthInstrumentFilter {
  private _combBuffers: Float32Array[];
  private _combBufferCounters: number[];
  private _allPassBuffers: Float32Array[];
  private _allPassInputBuffers: Float32Array[];
  private _allPassBufferCounters: number[];
  
  constructor(
    private _combDelays: number[],
    private _combGains: number[],
    private _allPassDelays: number[],
    private _allPassGains: number[],
    private _reverbMix: number) 
  {

    this._combBuffers = _combDelays.flatMap(delay => 
      [
        new Float32Array(delay), 
        new Float32Array(delay), 
      ]);

    this._combBufferCounters = _combDelays.map(_ => 
        0);
  
    this._allPassBuffers = _allPassDelays.flatMap(delay => 
        [
          new Float32Array(delay), 
          new Float32Array(delay), 
        ]);
        
    this._allPassInputBuffers = _allPassDelays.flatMap(delay => 
        [
          new Float32Array(delay), 
          new Float32Array(delay), 
        ]);

    this._allPassBufferCounters = _allPassDelays.map(delay => 
        0);  
  }


  filter(inputOutput: number[]): void {
    let resultChan0 = 0;
    let resultChan1 = 0;

    // Comb filters
    const combFilterCount = this._combDelays.length;    
    let bufferIndex = 0;    
    for(let combFilterIndex = 0; combFilterIndex < combFilterCount; combFilterIndex++, bufferIndex += 2) {
      let combBufferCounter = this._combBufferCounters[combFilterIndex];
      const combGain = this._combGains[combFilterIndex];

      let combOutputChan0 = 
        inputOutput[0] + combGain * this._combBuffers[bufferIndex][combBufferCounter];

      let combOutputChan1 = 
        inputOutput[1] + combGain * this._combBuffers[bufferIndex+1][combBufferCounter];
      
      this._combBuffers[bufferIndex][combBufferCounter] = combOutputChan0;
      this._combBuffers[bufferIndex+1][combBufferCounter] = combOutputChan1;

      combBufferCounter = 
        combBufferCounter == this._combDelays[combFilterIndex]-1 
          ? 0 
          : combBufferCounter + 1;

      this._combBufferCounters[combFilterIndex] = combBufferCounter;

      resultChan0 += combOutputChan0;
      resultChan1 += combOutputChan1;
    }

    // Allpass filters
    const allpassFilterCount = this._allPassDelays.length;    
    bufferIndex = 0;
    for(let allpassFilterIndex = 0; allpassFilterIndex < allpassFilterCount; allpassFilterIndex++, bufferIndex += 2) {
      let allpassFilterCounter = this._allPassBufferCounters[allpassFilterIndex];
      const allpassGain = this._allPassGains[allpassFilterIndex];

      let allpassOutputChan0 = 
        (resultChan0 * -allpassGain) + 
        this._allPassInputBuffers[bufferIndex][allpassFilterCounter] +
        (allpassGain * this._allPassBuffers[bufferIndex][allpassFilterCounter]);

      let allpassOutputChan1 = 
        (resultChan1 * -allpassGain) + 
        this._allPassInputBuffers[bufferIndex+1][allpassFilterCounter] +
        (allpassGain * this._allPassBuffers[bufferIndex+1][allpassFilterCounter]);

      this._allPassBuffers[bufferIndex][allpassFilterCounter] = allpassOutputChan0;
      this._allPassBuffers[bufferIndex+1][allpassFilterCounter] = allpassOutputChan1;
      this._allPassInputBuffers[bufferIndex][allpassFilterCounter] = resultChan0;
      this._allPassInputBuffers[bufferIndex+1][allpassFilterCounter] = resultChan1;

      allpassFilterCounter = 
        allpassFilterCounter >= this._allPassDelays[allpassFilterIndex]-1 
          ? 0
          : allpassFilterCounter + 1;
      

      this._allPassBufferCounters[allpassFilterIndex] = allpassFilterCounter;

      resultChan0 = allpassOutputChan0;
      resultChan1 = allpassOutputChan1;
    }

    inputOutput[0] += Math.max(Math.min(resultChan0 * this._reverbMix + inputOutput[0], 1), -1);    
    inputOutput[1] += Math.max(Math.min(resultChan1 * this._reverbMix + inputOutput[1], 1), -1);    
  }
}