import { EnvelopeCurveCoordinate, EnvelopeCurveState } from "../common/Envelopes";
import { WaveFormGenerator } from "../common/WaveFormGenerators";
import { IScriptSynthInstrumentFilter, IScriptSynthInstrumentNoteGenerator, ScriptSynthInstrument } from "./ScriptSynthInstrument";

export type Envelopes = {
  volume: EnvelopeCurveCoordinate[];
}


type EnvelopeState = {
  [envelope in keyof Envelopes]: EnvelopeCurveState;
}

class ScriptSynthInstrumentWaveNoteGenerator implements IScriptSynthInstrumentNoteGenerator {
  outputSampleRate: number;

  sample: Float32Array;
  sampleRate: number;
  sampleLoopStart: number;
  sampleLoopLen: number;
  
  note: number;
  
  pitchBend: number;
  volume: number;
  panning: number;

  vibratoGenerator: WaveFormGenerator | null = null;

  sampleCursor: number;
  effectivePitch: number = 0;
  inLoop: boolean = false;

  enterEnvelopes: Envelopes | null = null;
  exitEnvelopes: Envelopes | null = null;

  envelopeState: EnvelopeState | null = null;
  releasing: boolean = false;
  

  constructor(instrument: ScriptSynthWaveInstrument, note: number, outputSampleRate: number, startSampleNumber: number) {
    this.outputSampleRate = outputSampleRate;

    this.sample = instrument.sample;
    this.sampleRate = instrument.sampleRate;
    this.sampleLoopStart = instrument.sampleLoopStart;
    this.sampleLoopLen = instrument.sampleLoopLen;
    this.volume = instrument.volume;
    this.enterEnvelopes = instrument.enterEnvelopes;
    this.exitEnvelopes = instrument.exitEnvelopes;
    this.note = note;
    this.pitchBend = 0;
    
    this.calculateEffectivePitch();

    this.panning = 0.5;

  
    this.sampleCursor = 0;
    this.startEnvelope(this.enterEnvelopes, false, startSampleNumber);    
  }

  public getNoteSample(currentSample: number, currentTime: number, outChannels: number[]): boolean {
    // Update envelopes
    const envelopeState = this.envelopeState;
    if(this.releasing && !envelopeState?.volume?.running) {
      return false;
    }

    let sampleIndex = this.sampleCursor;

    if(sampleIndex < this.sample.length-1) {
      if(envelopeState?.volume?.running) {
        envelopeState.volume.updateEnvelopeState(currentSample);
      }
      
      // Compute current effective volume, pitch, panning
      const sampleEffectiveVolume = this.volume
        * (this.envelopeState?.volume?.currentValue ?? 1);
        
      const sampleEffectivePitch = this.effectivePitch 
        * (1 + (this.vibratoGenerator ? this.vibratoGenerator(currentTime) : 0));

      const sampleEffectivePanning = this.panning ;

      // Emit sample based on volume, pitch, panning
      const sampleIndexFloor = Math.floor(sampleIndex);
      const baseSample =
        (this.sample[sampleIndexFloor] +
          (sampleIndex-sampleIndexFloor) * (this.sample[sampleIndexFloor+1]-this.sample[sampleIndexFloor])) *
          sampleEffectiveVolume;
      
      outChannels[0] += baseSample * (1-sampleEffectivePanning);
      outChannels[1] += baseSample * sampleEffectivePanning;
      
      // Advance sample index and loop
      sampleIndex += sampleEffectivePitch;

      if(!this.inLoop && sampleIndex >= this.sample.length-1 && this.sampleLoopLen) {
        sampleIndex = this.sampleLoopStart - (sampleIndex - this.sample.length);
        this.inLoop = true;
      }

      while(this.inLoop && sampleIndex >= this.sampleLoopLen + this.sampleLoopStart - 1) {
        sampleIndex -= this.sampleLoopLen;
      }
      
      this.sampleCursor = sampleIndex;

      return true;
    } else {
      return false;
    }
  }

  releaseNote(releaseSampleNumber: number) {
    this.releasing = true;
    this.startEnvelope(this.exitEnvelopes, true, releaseSampleNumber);
  }

  private startEnvelope(envelopes: Envelopes | null, startFromCurrent: boolean, epochSampleNumber: number) {
    this.envelopeState = envelopes && {
      volume: envelopes.volume && 
        new EnvelopeCurveState(envelopes.volume, 
          startFromCurrent ? this.envelopeState!.volume.currentValue : 0, 
          epochSampleNumber, this.outputSampleRate)      
    }
  }

  setVolume(volume: any) {
    this.volume = volume;
  }
  setPanning(panning: number) {
    this.panning = panning;
  }

  setPitchBend(pitchBend: number) {
    this.pitchBend = pitchBend;
    this.calculateEffectivePitch();
  }

  setVibratorGenerator(vibratoGenerator: WaveFormGenerator | null) {
    this.vibratoGenerator = vibratoGenerator;
  }

  private calculateEffectivePitch() {
    const samplePitch = Math.pow(2, (this.note+this.pitchBend)/12);
    this.effectivePitch = (this.sampleRate / this.outputSampleRate) * samplePitch;
  }
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


  createNoteGenerator(note: number, outputSampleRate: number, startSampleNumber: number) : IScriptSynthInstrumentNoteGenerator {
    return new ScriptSynthInstrumentWaveNoteGenerator(this, note, outputSampleRate, startSampleNumber);
  }
  
  override createFilterState(outputSampleRate: number): IScriptSynthInstrumentFilter | null {
    return null;
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

  get volume(): number {
    return this._volume;
  }

  get enterEnvelopes(): Envelopes | null {
    return this._enterEnvelopes;
  }

  get exitEnvelopes(): Envelopes | null {
    return this._exitEnvelopes;;
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