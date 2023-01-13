import { EnvelopeCurveCoordinate } from "../common/Envelopes";


export type Envelopes = {
  volume: EnvelopeCurveCoordinate[];
}


export interface ScriptSynthGeneratedToneParameters {
  sample: Float32Array | null;
  sampleRate: number;

  sampleStartOffset: number;
  sampleLoopStart: number;
  sampleLoopLen: number;

  samplePitch: number;
  volume: number;

  enterEnvelopes: Envelopes | null;
  exitEnvelopes: Envelopes | null;
}

export abstract class ScriptSynthInstrument {
  abstract configureToneGenerationParams(outputParams: ScriptSynthGeneratedToneParameters, note: number): void;
}

export class ScriptSynthWaveInstrument extends ScriptSynthInstrument {
  private _sample: Float32Array;
  private _audioBuffer: AudioBuffer | null = null;

  private _sampleRate: number;

  private _sampleLoopStart: number;
  private _sampleLoopLen: number;

  private _volume: number;

  private _enterEnvelopes: Envelopes | null;
  private _exitEnvelopes: Envelopes | null;


  constructor(
    sample: Float32Array,
    sampleRate: number,
    loopStart?: number, loopLen?: number,
    volume: number = 1,
    enterEnvelopes: Envelopes | null = null,
    exitEnvelopes: Envelopes | null = null) {
    super();
    this._sample = sample;
    this._sampleRate = sampleRate;

    this._sampleLoopStart = loopStart || 0;
    this._sampleLoopLen = loopLen || 0;
    this._volume = volume;
    this._enterEnvelopes = enterEnvelopes;
    this._exitEnvelopes = exitEnvelopes;
  }

  configureToneGenerationParams(outputParams: ScriptSynthGeneratedToneParameters, note: number) {
    outputParams.samplePitch = Math.pow(2, note/12);
    outputParams.sample = this.sample;
    outputParams.sampleLoopStart = this._sampleLoopStart;
    outputParams.sampleLoopLen = this.sampleLoopLen;
    outputParams.sampleRate = this._sampleRate;
    outputParams.volume = this._volume;
    outputParams.enterEnvelopes = this._enterEnvelopes;
    outputParams.exitEnvelopes = this._exitEnvelopes;
  }
  
  get sample(): Float32Array {
    return this._sample;
  }

  get sampleLoopStart(): number {
    return this._sampleLoopStart;
  }

  get sampleLoopLen(): number {
    return this._sampleLoopLen;
  }

  getAudioBuffer(minDuration: number): AudioBuffer {
    if(this._audioBuffer?.duration || 0 <= minDuration) {
      // Todo generate loop
      const buff = new AudioBuffer({ sampleRate: this._sampleRate, numberOfChannels: 1, length: this._sample.length });
      buff.copyToChannel(this._sample, 0, 0);
      this._audioBuffer = buff;
    }

    return this._audioBuffer!;
  }

}