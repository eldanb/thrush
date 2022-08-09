import { ThrushSequenceEndEvent, ThrushSequenceGenerator, ThrushSequenceMarkerEvent } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerEvent } from "../../ThrushSynthesizerInterface";
import { ThrushArraySequenceGenerator } from "../ThrushArraySequenceGenerator";
import { CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";
import { TimingSpecification } from "./TimingSpecification";

const BASE_NOTE_NUMBER: { [note: string]: number } = {
  'c': 0,
  'd': 2,
  'e': 4,
  'f': 5,
  'g': 7,
  'a': 9, 
  'b': 11
};

export class NoteSpecification extends CompilableSimplePart {
  private noteNumber: number;

  constructor(
    note: string, 
    sharp: boolean | null,
    octave: number, 
    private _timing: TimingSpecification) {
      super();

      this.noteNumber = BASE_NOTE_NUMBER[note] + octave * 12 + (sharp ? 1 : 0);
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    return new ThrushArraySequenceGenerator([

      new ThrushCommonSynthesizerEvent(0, sequenceContext.synth!, sequenceContext.currentSequenceCommandChannel, {
        newNote: { 
          instrumentId: sequenceContext.instrumentId,
          note: this.noteNumber
        }
      }),

      new ThrushSequenceEndEvent(this._timing!.delay(sequenceContext.tempo))
    ]);    
  }
}