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
  'a': -3, 
  'b': -1
};

export class NoteSpecification extends CompilableSimplePart {
  private noteNumber: number;
  private volModifier: number;

  constructor(
    note: string, 
    sharp: boolean | null,
    octave: number, 
    private _timing: TimingSpecification,
    volModifier: string | null) {
      super();

      this.noteNumber = BASE_NOTE_NUMBER[note] + octave * 12 + (sharp ? 1 : 0);

      this.volModifier = 1;
      if(volModifier) {
        volModifier.split('').forEach(m => this.volModifier *= m == '!' ? 1.1 : 0.9);
      }
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    return new ThrushArraySequenceGenerator([

      new ThrushCommonSynthesizerEvent(0, sequenceContext.synth!, sequenceContext.currentSequenceCommandChannel!, {
        newNote: { 
          instrumentId: sequenceContext.instrumentId,
          note: this.noteNumber
        },
        panning: sequenceContext.notePanning,
        volume: Math.min(1, sequenceContext.noteVolume * this.volModifier)
      }),

      new ThrushSequenceEndEvent(this._timing!.delay(sequenceContext.tempo))
    ]);    
  }
}