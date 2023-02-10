import { WaveFormType } from "./synth/common/WaveFormGenerators";
import { ThrushSequenceEvent, ThrushSequencer } from "./ThrushSequencer";

export type ThrushCommonSynthesizerVibratoParameters = {
  waveform: "none" | WaveFormType;
  frequency: number;
  amplitude: number;  
}

export type ThrushCommonSynthesizerEventCommands = {
  newNote?: { 
    instrumentId: string;
    note: number; 
  };
  releaseNote?: boolean;
  volume?: number;
  panning?: number;
  vibrato?: ThrushCommonSynthesizerVibratoParameters;
}

export class ThrushCommonSynthesizerEvent extends ThrushSequenceEvent {

  constructor(
    public override time: number, 
    public targetSynth: ThrushCommonSynthesizerInterface,
    public channelOrNoteId: number | string,
    public commands: ThrushCommonSynthesizerEventCommands
  ) {
    super();
  }

  clone(): ThrushSequenceEvent {
    return new ThrushCommonSynthesizerEvent(this.time, this.targetSynth, this.channelOrNoteId, this.commands);
  }

  route(sequencer: ThrushSequencer): Promise<void> {
    return this.targetSynth.enqueueSynthEvent(this);
  }
}

export interface ThrushCommonSynthesizerInterface {
  panic(): Promise<void>;

  enqueueSynthEvent(synthEvent: ThrushCommonSynthesizerEvent): Promise<void>;
  executeImmediateCommand(immediateChannelCommand: ThrushCommonSynthesizerEventCommands): Promise<number>;
}