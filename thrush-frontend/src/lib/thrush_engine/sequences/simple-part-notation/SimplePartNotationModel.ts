import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerInterface, ThrushCommonSynthesizerVibratoParameters } from "../../ThrushSynthesizerInterface";

export class NoteSequenceContext {

  tempo: number = 0.5;

  synth: ThrushCommonSynthesizerInterface | null = null;
  instruments: number[] = [];

  instrumentId: number = 0;
  noteVolume: number = 1;
  notePanning: number = 0.5;

  private _noteVibrato: ThrushCommonSynthesizerVibratoParameters;

  get noteVibratoDepth(): number {
    return this._noteVibrato.amplitude;
  }

  set noteVibratoDepth(v: number) {
    this._noteVibrato.amplitude = v;
  }

  get noteVibratoFrequency(): number {
    return this._noteVibrato.amplitude;
  }

  set noteVibratoFrequency(v: number) {
    this._noteVibrato.frequency = v;
  }

  get noteVibrato() {
    return this._noteVibrato.amplitude && this._noteVibrato.frequency 
      ? this._noteVibrato 
      : undefined;
  }

  noteIdSeed: number = 0;
  noteIdPrefix: string = "s.";
    
  latestNoteId: string | null = null;

  constructor() {
    this._noteVibrato = {
      amplitude: 0,
      frequency: 0,
      waveform: "sine"
    };
  }

  generateNoteId(): string {
    return `${this.noteIdPrefix}${this.noteIdSeed++}`
  }
  
  createInheritedContext() {
    const ret = new NoteSequenceContext();
    
    Object.assign(ret, { 
      tempo: this.tempo, 
      synth: this.synth, 
      instrumentId: this.instrumentId,
      notePanning: this.notePanning,
      noteVolume: this.noteVolume,
      instruments: this.instruments,
      noteIdPrefix: `${this.generateNoteId()}.`,
      noteVibratoDepth: this.noteVibratoDepth,
      noteVibratoFrequency: this.noteVibratoDepth,
    });

    return ret;
  }
}

export abstract class CompilableSimplePart {
  abstract compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator | null;
}

