import { parseWav } from "src/lib/formats/WavParser";
import { EnvelopeCurveCoordinate } from "../common/Envelopes";

export type Envelopes = {
  volume: EnvelopeCurveCoordinate[];
}

export class NativeSynthesizerInstrument {
  private _sample: Float32Array;
  private _audioBuffer: AudioBuffer | null = null;

  private _sampleRate: number;

  private _sampleLoopStart: number;
  private _sampleLoopLen: number;

  private _enterEnvelopes: Envelopes | undefined;
  private _exitEnvelopes: Envelopes | undefined;

  constructor(sample: Float32Array, sampleRate: number, loopStart?: number, loopLen?: number, enterEnvelopes?: Envelopes, exitEnvelopers?: Envelopes) {

    this._sample = sample;
    this._sampleRate = sampleRate;

    this._sampleLoopStart = loopStart || 0;
    this._sampleLoopLen = loopLen || 0;

    this._enterEnvelopes = enterEnvelopes;
    this._exitEnvelopes = exitEnvelopers;
  }

  get enterEnvelopes(): Envelopes | undefined {
    return this._enterEnvelopes;
  }

  get exitEnvelopes(): Envelopes | undefined {
    return this._exitEnvelopes;
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

  get sampleRate(): number {
    return this._sampleRate;
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
      parsedWav.samples[0], parsedWav.sampleRate, 0, parsedWav.samples.length-1000);
  }
}
