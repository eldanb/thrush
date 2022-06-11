import { ThrushSequenceEvent, ThrushSequencer } from "./ThrushSequencer";

export type ThrushCommonSynthesizerEventCommands = {
  newNote?: { 
    instrumentId: number;
    note: number; 
  };
  volume?: number;
  panning?: number;
}

export class ThrushCommonSynthesizerEvent extends ThrushSequenceEvent {

  constructor(
    public override time: number, 
    public targetSynth: ThrushCommonSynthesizerInterface,
    public channel: number,
    public commands: ThrushCommonSynthesizerEventCommands
  ) {
    super();
  }

  route(sequencer: ThrushSequencer): Promise<void> {
    return this.targetSynth.enqueueSynthEvent(this);
  }
}

export interface ThrushCommonSynthesizerInterface {
  panic(): Promise<void>;

  enqueueSynthEvent(synthEvent: ThrushCommonSynthesizerEvent): Promise<void>;
}