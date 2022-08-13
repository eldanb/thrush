import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { ChannelAllocationManager } from "./ChannelAllocationManager";

export class NoteSequenceContext {

  tempo: number = 0.5;

  synth: ThrushCommonSynthesizerInterface | null = null;
  instruments: number[] = [];

  instrumentId: number = 0;
  noteVolume: number = 1;
  notePanning: number = 0.5;    
    
  currentSequenceCommandChannel: number | null = null;

  constructor(public channelAllocationManager: ChannelAllocationManager) {
  }

  createInheritedContext() {
    const inheritedAllocation = new ChannelAllocationManager(this.channelAllocationManager);
    const ret = new NoteSequenceContext(inheritedAllocation);
    
    Object.assign(ret, { 
      tempo: this.tempo, 
      synth: this.synth, 
      instrumentId: this.instrumentId,
      notePanning: this.notePanning,
      noteVolume: this.noteVolume,
      instruments: this.instruments      
    });

    return ret;
  }
}

export abstract class CompilableSimplePart {
  abstract compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator | null;
}

