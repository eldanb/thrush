import { parseWav } from "src/lib/formats/WavParser";

export class NativeSynthesizerInstrument {
  private _sample: Float32Array;
  private _audioBuffer: AudioBuffer | null = null;

  private _sampleRate: number;

  private _sampleLoopStart: number;
  private _sampleLoopLen: number;

  constructor(sample: Float32Array, sampleRate: number, loopStart?: number, loopLen?: number) {

    this._sample = sample;
    this._sampleRate = sampleRate;

    this._sampleLoopStart = loopStart || 0;
    this._sampleLoopLen = loopLen || sample.length;
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

  static fromWavFileContent(instrumentBuff: ArrayBuffer): NativeSynthesizerInstrument {
    const parsedWav = parseWav(instrumentBuff);

    return new NativeSynthesizerInstrument(
      parsedWav.samples, parsedWav.sampleRate, 0, parsedWav.samples.length-1000);
  }
}
