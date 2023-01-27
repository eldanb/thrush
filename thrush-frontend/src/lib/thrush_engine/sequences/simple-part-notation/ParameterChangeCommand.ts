import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerEventCommands } from "../../ThrushSynthesizerInterface";
import { ThrushArraySequenceGenerator } from "../ThrushArraySequenceGenerator";
import { CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";


function TargetValue(baseValue: number, relative: string | null, value: number, valueScaling: number, clampMin: number, clampMax: number) {
  let ret = baseValue;

  switch(relative) {
    case '+':
      ret += value/valueScaling;
      break;

    case '-':
      ret -= value/valueScaling;
      break; 

    default:
      ret = value/valueScaling;
      break;      
  }

  return Math.max(Math.min(ret, clampMax), clampMin);
}

export class ParameterChangeRequest {
  constructor(private _paramId: string, private _relative: string | null, private _value: number) {

  }

  applyToEvent(commands: ThrushCommonSynthesizerEventCommands, context: NoteSequenceContext) {
    switch(this._paramId) {
      case 'v':
        context.noteVolume = TargetValue(context.noteVolume, this._relative, this._value, 100, 0, 1);
        commands.volume = context.noteVolume;
        break;

      case 'p':
        context.notePanning = TargetValue(context.notePanning, this._relative, this._value, 100, 0, 1);
        commands.panning = context.notePanning;
        break;

      case 'd':
        context.noteVibratoDepth = TargetValue(context.noteVibratoDepth, this._relative, this._value, 1000, 0, 1);
        commands.vibrato = context.noteVibrato;
        break;

      case 'f':
        context.noteVibratoFrequency = TargetValue(context.noteVibratoFrequency, this._relative, this._value, 100, 0, 500);
        commands.vibrato = context.noteVibrato;
        break;
  
      case 'i':
        if(this._relative) {
          throw new Error("Can't execute relative change for instrucment.");
        }
        context.instrumentId = context.instruments[this._value];
        break;

      case 't':
        if(this._relative) {
          throw new Error("Can't execute relative change for tempo.");
        }
        context.tempo = TargetValue(context.tempo, this._relative, this._value, 1, 20, 240);
        break;
          
    }
  }
}

export class ParameterChangeCommand extends CompilableSimplePart {
  constructor(private _changeRequests: ParameterChangeRequest[], private _immediate: boolean) { 
    super();
  }

  
  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator | null{
    const commands: ThrushCommonSynthesizerEventCommands = {};
    this._changeRequests.forEach(r => r.applyToEvent(commands, sequenceContext));

    if(this._immediate) {
      return new ThrushArraySequenceGenerator([
        new ThrushCommonSynthesizerEvent(
          0, 
          sequenceContext.synth!, 
          sequenceContext.latestNoteId!, 
          commands)
      ]);
    } else {
      return null;
    }
  }
}