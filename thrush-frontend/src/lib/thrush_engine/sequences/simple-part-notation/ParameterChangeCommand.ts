import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerEventCommands } from "../../ThrushSynthesizerInterface";
import { ThrushArraySequenceGenerator } from "../ThrushArraySequenceGenerator";
import { CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";



export const NoteParameterUpdaters: {
  [parameter: string]: {
    update: (context: NoteSequenceContext, value: number, commandToUpdate: ThrushCommonSynthesizerEventCommands | null) => void,
    getFromContext: (context: NoteSequenceContext) => number
  }
} = {
  'v': {
    update(context, value, commandToUpdate) {
        context.noteVolume = value/100;
        if(commandToUpdate) {
          commandToUpdate.volume = value/100;
        }
    },
    getFromContext(context) {
      return context.noteVolume*100;
    }
  },

  'p': {
    update(context, value, commandToUpdate) {
        context.notePanning = value/100;
        if(commandToUpdate) {
          commandToUpdate.panning = value/100;
        }
    },
    getFromContext(context) {
      return context.notePanning*100;
    }
  },

  'd': {
    update(context, value, commandToUpdate) {
        context.noteVibratoDepth = value/1000;
        if(commandToUpdate) {
          commandToUpdate.vibrato = context.noteVibrato;
        }
    },
    getFromContext(context) {
      return context.noteVibratoDepth * 1000;
    }
  },

  'f': {
    update(context, value, commandToUpdate) {
        context.noteVibratoFrequency = value/100;
        if(commandToUpdate) {
          commandToUpdate.vibrato = context.noteVibrato;
        }
    },
    getFromContext(context) {
      return context.noteVibratoFrequency * 100;
    }
  }
}

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
      case 'i':
        if(this._relative) {
          throw new Error("Can't execute relative change for instrument.");
        }
        context.instrumentId = context.instruments[this._value];
        break;

      case 't':
        if(this._relative) {
          throw new Error("Can't execute relative change for tempo.");
        }
        context.tempo = TargetValue(context.tempo, this._relative, this._value, 1, 20, 240);
        break;

      default:
        const paramUpdater = NoteParameterUpdaters[this._paramId];
        switch(this._relative) {
          case '+':
            paramUpdater.update(context, paramUpdater.getFromContext(context) + this._value, commands);
            break;

          case '-':
            paramUpdater.update(context, paramUpdater.getFromContext(context) - this._value, commands);
            break;

          default:
            paramUpdater.update(context, this._value, commands);
            break;  
        }
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