import { IScriptSynthInstrumentFilter } from "../ScriptSynthInstrument";

export type ResonantMultimodeFilterMode = "hp" | "lp" | "bp";

export class ResonantMultimodeFilter implements IScriptSynthInstrumentFilter {  
  private _feedbackFactor: number;
  
  private buf0: number[] = [0, 0];
  private buf1: number[] = [0, 0];
  private buf2: number[] = [0, 0];
  private buf3: number[] = [0, 0];

  constructor(
    private _mode: ResonantMultimodeFilterMode,
    private _cutoff: number,
    resonance: number,
    private _sampleRate: number) 
  {
    this._feedbackFactor = resonance + resonance/(1.0 - _cutoff);
  }


  filter(inputOutput: number[]): void {
    for(let c=0; c<2; c++) {
      this.buf0[c] += this._cutoff * (inputOutput[c] - this.buf0[c] + this._feedbackFactor * (this.buf0[c] - this.buf1[c]));
      this.buf1[c] += this._cutoff * (this.buf0[c] - this.buf1[c])
      this.buf2[c] += this._cutoff * (this.buf1[c] - this.buf2[c])
      this.buf3[c] += this._cutoff * (this.buf2[c] - this.buf3[c])

      switch(this._mode) {
        case "hp":
          inputOutput[c] = inputOutput[c] - this.buf3[c];
          break;

        case "lp":
          inputOutput[c] = this.buf3[c];
          break;

        case "bp":
          inputOutput[c] = this.buf0[c] - this.buf3[c];
          break;
      }
    }    
  }
}