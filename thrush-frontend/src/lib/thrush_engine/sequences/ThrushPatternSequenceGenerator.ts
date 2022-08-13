import { ThrushArraySequenceGenerator } from "./ThrushArraySequenceGenerator";
import { ThrushSequenceEvent, ThrushSequenceMarkerEvent } from "../ThrushSequencer";
import { ThrushCommonSynthesizerEvent, ThrushCommonSynthesizerInterface } from "../ThrushSynthesizerInterface";

export type ThrushPatternChannelEffectSlideVolume = {
  type: "vol_slide",
  slide: number
}

export type ThrushPatternChannelEffectSetVolume = {
  type: "vol_set",
  value: number
}

export type ThrushPatternChannelEffectSlidePadding = {
  type: "pan_slide",
  slide: number
}

export type ThrushPatternChannelEffectSetPadding = {
  type: "pan_set",
  value: number
}

export type ThrushPatternChannelEffect = 
  ThrushPatternChannelEffectSlideVolume | 
  ThrushPatternChannelEffectSetVolume | 
  ThrushPatternChannelEffectSlidePadding | 
  ThrushPatternChannelEffectSetPadding;
;


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

const CHANNEL_EFFECT_APPLIERS: { 
  [effectType in ThrushPatternChannelEffect['type']]: 
    (effect: ThrushPatternChannelEffect & { type: effectType }, channel: ThrushPatternChannelState) => boolean
} = {
  vol_set(effect, channel) {
    channel.volume = effect.value;
    return true;
  },

  vol_slide(effect, channel) {
    
    channel.volume += effect.slide;
    
    if(channel.volume > 1) {
      channel.volume = 1;
    } else 
    if(channel.volume < 0) {
      channel.volume = 0;
    }

    return true;
  },

  pan_set(effect, channel) {
    channel.panning = effect.value
    return true;
  },

  pan_slide(effect, channel) {
    
    channel.panning += effect.slide;
    
    if(channel.panning > 1) {
      channel.panning = 1;
    } else 
    if(channel.panning < 0) {
      channel.panning = 0;
    }

    return true;
  }
}

export class ThrushPatternSequenceGenerator extends ThrushArraySequenceGenerator {
  constructor(private _pattern: ThrushPattern, private _binding: ThrushPatternBinding, private _cursorName: string) {
    super(ThrushPatternSequenceGenerator.compilePattern(_pattern, _binding, _cursorName));
  }

  private static compilePattern(pattern: ThrushPattern, binding: ThrushPatternBinding, cursorName: string): ThrushSequenceEvent[] {
    const ret: ThrushSequenceEvent[] = [];
    let bpm: number = pattern.bpm;
    let ticksPerDiv: number = pattern.ticksPerDivision;
    let time: number = 0;
    let channelState: ThrushPatternChannelState[] = [];

    pattern.rows.forEach((row, index) => {
      ret.push(new ThrushSequenceMarkerEvent(time, cursorName, index));

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
          const applyChannelEffect = CHANNEL_EFFECT_APPLIERS[channelEffect.type];
          if(applyChannelEffect) {
            const appliedEffectRequiresEvent = applyChannelEffect(channelEffect as any, currentChannelState);
            hasPrimaryEvent = hasPrimaryEvent || appliedEffectRequiresEvent;
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
              volume: currentChannelState.volume,
              vibrato: {
                waveform: "sine",
                frequency: index / 30 * 3,
                amplitude: 1/36
              }
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

    ret.push(new ThrushSequenceMarkerEvent(time, cursorName, null));
    return ret;
  }
}