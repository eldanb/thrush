import { ThrushSequenceEndEvent, ThrushSequenceGenerator, ThrushSequenceMarkerEvent } from "../../ThrushSequencer";
import { ThrushArraySequenceGenerator } from "../ThrushArraySequenceGenerator";
import {  CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";
import { TimingSpecification } from "./TimingSpecification";

export class PauseSpecification extends CompilableSimplePart {
  constructor(private _timing: TimingSpecification | null) {
    super();
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    return new ThrushArraySequenceGenerator([
      new ThrushSequenceEndEvent(this._timing!.delay(sequenceContext.tempo))
    ]);    
  }
}