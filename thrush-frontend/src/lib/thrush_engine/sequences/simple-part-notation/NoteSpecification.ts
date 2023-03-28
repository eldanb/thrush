import { CommaExpr } from "@angular/compiler";
import { ThrushSequenceEndEvent, ThrushSequenceGenerator, ThrushSequenceMarkerEvent } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerEventCommands } from "../../ThrushSynthesizerInterface";
import { ThrushArraySequenceGenerator } from "../ThrushArraySequenceGenerator";
import { CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";
import { TimingSpecification } from "./TimingSpecification";
import { NoteParameterUpdaters } from "./ParameterChangeCommand";

const BASE_NOTE_NUMBER: { [note: string]: number } = {
  'c': 0,
  'd': 2,
  'e': 4,
  'f': 5,
  'g': 7,
  'a': -3, 
  'b': -1
};

const LINEAR_PARAM_CHANGE_RESOLUTION_SEC = 0.01;

export class NoteChangeRequestParameter {
  constructor(public parameter: string, public linear: boolean, public newValue: number) {
  }
}

export class NoteChangeRequest {
  constructor(public relTime: number, public parameterChange: NoteChangeRequestParameter[]) {

  }
}

export class NoteSpecification extends CompilableSimplePart {
  private noteNumber: number;
  private volModifier: number;

  constructor(
    note: string, 
    sharp: boolean | null,
    octave: number, 
    private _timing: TimingSpecification,
    volModifier: string | null,
    private _noteChangeRequests: NoteChangeRequest[] | null) {
      super();

      this.noteNumber = BASE_NOTE_NUMBER[note] + octave * 12 + (sharp ? 1 : 0);

      this.volModifier = 1;
      if(volModifier) {
        volModifier.split('').forEach(m => this.volModifier *= m == '!' ? 1.1 : 0.9);
      }
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    const noteId = sequenceContext.generateNoteId();
    const endTime = this._timing!.delay(sequenceContext.tempo);

    return new ThrushArraySequenceGenerator([

      new ThrushCommonSynthesizerEvent(0, sequenceContext.synth!, noteId, {
        newNote: { 
          instrumentId: sequenceContext.instrumentId,
          note: this.noteNumber
        },
        panning: sequenceContext.notePanning,
        volume: Math.min(1, sequenceContext.noteVolume * this.volModifier),
        vibrato: sequenceContext.noteVibrato,
        pitchBend: sequenceContext.pitchBend
      }),

      ...this.generateNoteChangeEvents(endTime, sequenceContext),

      new ThrushCommonSynthesizerEvent(endTime, sequenceContext.synth!, noteId, { releaseNote: true }),

      new ThrushSequenceEndEvent(endTime)
    ]);
  }

  private generateNoteChangeEvents(endTime: number, sequenceContext: NoteSequenceContext): ThrushCommonSynthesizerEvent[] {
    if(!this._noteChangeRequests?.length) {
      return [];
    }

    const ret: ThrushCommonSynthesizerEvent[] = [];
    let startTime = 0;
    this._noteChangeRequests.forEach(changeRequest => {
      const targetTime = changeRequest.relTime * endTime;
      const endOfTimeCommands: ThrushCommonSynthesizerEventCommands = {};

      let hasLinear = false;
      const linearCommands: { time: number, relTime: number, commands: ThrushCommonSynthesizerEventCommands}[] = [];


      for(let linearTime = startTime, linearCommandIndex = 0; 
        linearCommandIndex < Math.floor((targetTime-startTime) / LINEAR_PARAM_CHANGE_RESOLUTION_SEC); 
        linearTime += LINEAR_PARAM_CHANGE_RESOLUTION_SEC, linearCommandIndex++) {
        const linearRelTime = (linearTime-startTime)/(targetTime-startTime);
        linearCommands.push({ time: linearTime, relTime: linearRelTime, commands: {} });
      }

      changeRequest.parameterChange.forEach(parameterChange => {
        const parameterHandler = NoteParameterUpdaters[parameterChange.parameter];

        if(parameterChange.linear) {
          hasLinear = true;
          const linearChangeParameterStartValue = parameterHandler.getFromContext(sequenceContext);
          linearCommands.forEach(linearCommand => {
            const linearValue = 
              linearChangeParameterStartValue +
              (parameterChange.newValue-linearChangeParameterStartValue) * linearCommand.relTime;
            parameterHandler.update(sequenceContext, linearValue, linearCommand.commands);
          });
        }

        parameterHandler.update(sequenceContext, parameterChange.newValue, endOfTimeCommands);
      })

      if(hasLinear) {        
        linearCommands.forEach(linearCommand => 
          ret.push(new ThrushCommonSynthesizerEvent(
            linearCommand.time, 
            sequenceContext.synth!,
            sequenceContext.latestNoteId!,
            linearCommand.commands
          )));
      }
        
      ret.push(new ThrushCommonSynthesizerEvent(
        targetTime, 
        sequenceContext.synth!, 
        sequenceContext.latestNoteId!, 
        endOfTimeCommands));

      startTime = targetTime;
    });

    return ret;
  }
}