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

  'a': {
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

  'p': {
    update(context, value, commandToUpdate) {
      const translatedPitchOffset = (value-640)/64;
      context.pitchBend = translatedPitchOffset;
      if(commandToUpdate) {
        commandToUpdate.pitchBend = translatedPitchOffset;
      }
    },
    getFromContext(context) {
      return (context.pitchBend*64)+640;
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
  },


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

  applyToEvent(context: NoteSequenceContext) {
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
            paramUpdater.update(context, paramUpdater.getFromContext(context) + this._value, null);
            break;

          case '-':
            paramUpdater.update(context, paramUpdater.getFromContext(context) - this._value, null);
            break;

          default:
            paramUpdater.update(context, this._value, null);
            break;  
        }
    }
  }
}

export class ParameterChangeCommand extends CompilableSimplePart {
  constructor(private _changeRequests: ParameterChangeRequest[]) { 
    super();
  }

  
  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator | null{
    const commands: ThrushCommonSynthesizerEventCommands = {};
    this._changeRequests.forEach(r => r.applyToEvent(sequenceContext));

    return null;
  }
}