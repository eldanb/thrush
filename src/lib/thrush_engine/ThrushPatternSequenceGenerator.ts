import { ThrushArraySequenceGenerator } from "./ThrushArraySequenceGenerator";
import { ThrushSequenceEvent, ThrushSequenceMarkerEvent } from "./ThrushSequencer";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "./ThrushSynthesizerInterface";

export type ThrushPatternChannelEffectSlideVolume = {
  type: "vol_slide",
  slide: number
}

export type ThrushPatternChannelEffectSetVolume = {
  type: "vol_set",
  value: number
}

export type ThrushPatternChannelEffect = ThrushPatternChannelEffectSlideVolume | ThrushPatternChannelEffectSetVolume;


export type ThrushPatternChannelCommand = {
  sampleNumber?: number;
  note?: number;
  effects?: ThrushPatternChannelEffect[];
}

export type ThrushPatternRowCommandSetSpeed = {
  type: "set_speed";
  bpm: number;
  ticksPerDiv: number;
}

export type ThrushPatternRowCommand = ThrushPatternRowCommandSetSpeed;

export type ThrushPatternRow = {
  rowCommands?: ThrushPatternRowCommand[];
  channelCommands: ThrushPatternChannelCommand[];
}

export type ThrushPattern = {
  bpm: number;
  ticksPerDivision: number;

  rows: ThrushPatternRow[];
}

export type ThrushPatternBinding = {
  synth: ThrushCommonSynthesizerInterface;
  sampleInsturmentHandles: number[];  
}

type ThrushPatternChannelState = {
  sample: number;
  volume: number;
  panning: number;
}

export class ThrushPatternSequenceGenerator extends ThrushArraySequenceGenerator {
  constructor(private _pattern: ThrushPattern, private _binding: ThrushPatternBinding) {
    super(ThrushPatternSequenceGenerator.compilePattern(_pattern, _binding));
  }

  private static compilePattern(pattern: ThrushPattern, binding: ThrushPatternBinding): ThrushSequenceEvent[] {
    const ret: ThrushSequenceEvent[] = [];
    let bpm: number = pattern.bpm;
    let ticksPerDiv: number = pattern.ticksPerDivision;
    let time: number = 0;
    let channelState: ThrushPatternChannelState[] = [];

    pattern.rows.forEach((row, index) => {
      row.channelCommands.forEach((channelCommand, channelIndex) => {
        const orgLookup = channelState[channelIndex];
        const currentChannelState = orgLookup || { sample: 0, volume: 1 };
        if(!orgLookup) {
          channelState[channelIndex] = currentChannelState;
        }

        let hasPrimaryEvent = false;

        if(channelCommand.sampleNumber != null) {
          currentChannelState.sample = channelCommand.sampleNumber;
        }

        if(channelCommand.note) {
          hasPrimaryEvent = true;
        }

        channelCommand.effects?.forEach((channelEffect) => {
          switch(channelEffect.type) {
            case "vol_slide":
              hasPrimaryEvent = true;
              currentChannelState.volume += channelEffect.slide;
              if(currentChannelState.volume > 1) {
                currentChannelState.volume = 1;
              } else 
              if(currentChannelState.volume < 0) {
                currentChannelState.volume = 0;
              }
              break;

            case "vol_set":
              hasPrimaryEvent = true;
              currentChannelState.volume = channelEffect.value;
              break;
          }
        })

        if(hasPrimaryEvent) {
          
          ret.push(new ThrushCommonSynthesizerEvent(
            time,
            binding.synth,
            channelIndex,
            {
              newNote: channelCommand.note ? { 
                instrumentId: binding.sampleInsturmentHandles[currentChannelState.sample],
                note: channelCommand.note
              } : undefined,
              panning: currentChannelState.panning,
              volume: currentChannelState.volume
            }
          ))
        }
      })

      if(row.rowCommands) {
        row.rowCommands.forEach((rowCommand) => {
          switch(rowCommand.type) {
            case "set_speed":
              if(rowCommand.bpm != null) {
                bpm = rowCommand.bpm;
              }
              if(rowCommand.ticksPerDiv != null) {
                ticksPerDiv = rowCommand.ticksPerDiv;
              }
              break;            
          }
        })
      }

      time += 60/((24 * bpm)/ticksPerDiv);
    })

    ret.push(new ThrushSequenceMarkerEvent(time));
    return ret;
  }
}