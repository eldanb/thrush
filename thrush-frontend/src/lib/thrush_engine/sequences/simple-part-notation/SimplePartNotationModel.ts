import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";

export class NoteSequenceContext {

  tempo: number = 0.5;

  synth: ThrushCommonSynthesizerInterface | null = null;
  instruments: number[] = [];

  instrumentId: number = 0;
  noteVolume: number = 1;
  notePanning: number = 0.5;

  noteIdSeed: number = 0;
  noteIdPrefix: string = "s.";
    
  latestNoteId: string | null = null;

  constructor() {
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
      noteIdPrefix: `${this.generateNoteId()}.`
    });

    return ret;
  }
}

export abstract class CompilableSimplePart {
  abstract compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator | null;
}

