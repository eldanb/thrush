

export interface ScriptSynthGeneratedToneParameters {
  sample: Float32Array | null;
  sampleRate: number;

  sampleStartOffset: number;
  sampleLoopStart: number;
  sampleLoopLen: number;

  samplePitch: number;

  volume: number;
}

export abstract class ScriptSynthInstrument {
  abstract configureToneGenerationParams(outputParams: ScriptSynthGeneratedToneParameters, note: number): void;
}

export class ScriptSynthWaveInstrument extends ScriptSynthInstrument {
  private _sample: Float32Array;
  private _audioBuffer: AudioBuffer | null = null;

  private _sampleRate: number;

  private _sampleStartOffset: number;
  private _sampleLoopStart: number;
  private _sampleLoopLen: number;

  private _volume: number;

  constructor(
    sample: Float32Array,
    sampleRate: number,
    sampleStart?: number,
    loopStart?: number, loopLen?: number,
    volume: number = 1) {
    super();
    this._sample = sample;
    this._sampleRate = sampleRate;

    this._sampleStartOffset = sampleStart || 0;
    this._sampleLoopStart = loopStart || 0;
    this._sampleLoopLen = loopLen || 0;
    this._volume = volume;
  }

  configureToneGenerationParams(outputParams: ScriptSynthGeneratedToneParameters, note: number) {
    outputParams.samplePitch = Math.pow(2, note/12);
    outputParams.sample = this.sample;
    outputParams.sampleLoopStart = this._sampleLoopStart;
    outputParams.sampleStartOffset = this._sampleStartOffset;
    outputParams.sampleLoopLen = this.sampleLoopLen;
    outputParams.sampleRate = this._sampleRate;
    outputParams.volume = this._volume;
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

  static fromWavFileContent(instrumentBuff: ArrayBuffer): ScriptSynthWaveInstrument {
    const blobArrayBuffer = instrumentBuff;

    var hdr = new Uint32Array(blobArrayBuffer.slice(0,36));
    var samples = new Uint8Array(blobArrayBuffer.slice(58,
          blobArrayBuffer.byteLength-58));

    const smp = [];

    const smp_rate = hdr[6];
    for(var i =0 ; i<samples.length; i++)
    {
        smp[i] = (samples[i]) / 256;
    }

    return new ScriptSynthWaveInstrument(
      new Float32Array(smp), smp_rate, 0, (blobArrayBuffer).byteLength-1000);
  }

  static fromSampleBuffer(
    sampleBuffer: ArrayBuffer,
    sampleRate: number,
    sampleStart: number,
    loopStart: number,
    loopEnd: number,
    volume: number): ScriptSynthWaveInstrument {
    return new ScriptSynthWaveInstrument(
      new Float32Array(sampleBuffer), sampleRate, sampleStart, loopStart, loopEnd, volume);
  }
}
