import { IScriptSynthInstrumentFilter } from "../ScriptSynthInstrument";
import { STEPS_PER_SINE_CYCLE, SinLookup } from "../WaveformLookupTables";

export class ChorusFilter implements IScriptSynthInstrumentFilter {
  private chorusSampleBuffer: Float32Array[];
  private chorusSampleBufferCounter: number = 0;
  private chorusSampleBufferLen: number = 0;
  private chorusSampleOutCursor: number = 1;
  private chorusLfoIndex: number = 0;
  private chorusLfoIncrement: number = 0;

  constructor(
    chorusDelay: number, 
    lfoFrequency: number, 
    private chorusLfoScaling: number, 
    private chorusMixLevel: number, 
    private _sampleRate: number) 
  {
    this.chorusSampleBufferLen = Math.round(chorusDelay * this._sampleRate);
    this.chorusLfoIncrement = (STEPS_PER_SINE_CYCLE * lfoFrequency / this._sampleRate);

    this.chorusSampleBuffer = [ 
      new Float32Array(this.chorusSampleBufferLen), 
      new Float32Array(this.chorusSampleBufferLen) ];
  }


  filter(inputOutput: number[]): void {
    this.chorusSampleBuffer[0][this.chorusSampleBufferCounter] = inputOutput[0];
      this.chorusSampleBuffer[1][this.chorusSampleBufferCounter] = inputOutput[1];

      this.chorusSampleBufferCounter++;
      if(this.chorusSampleBufferCounter >= this.chorusSampleBufferLen) {
        this.chorusSampleBufferCounter = 0;
      }

      this.chorusSampleOutCursor += 1 + this.chorusLfoScaling * SinLookup[Math.round(this.chorusLfoIndex)];
      if(this.chorusSampleOutCursor > this.chorusSampleBufferLen - 1) {
        this.chorusSampleOutCursor = 0;
      }

      const sout = Math.round(this.chorusSampleOutCursor);
      inputOutput[0] += this.chorusMixLevel * this.chorusSampleBuffer[0][sout] || 0;
      inputOutput[1] += this.chorusMixLevel * this.chorusSampleBuffer[1][sout] || 0;

      this.chorusLfoIndex += this.chorusLfoIncrement;        
      if(this.chorusLfoIndex >= STEPS_PER_SINE_CYCLE-1) {
        this.chorusLfoIndex = 0;
      }
  }
}