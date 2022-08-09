import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushCommonSynthesizerInterface } from "../../ThrushSynthesizerInterface";
import { ChannelAllocationManager } from "./ChannelAllocationManager";

export class NoteSequenceContext {

  tempo: number = 0.5;
  synth: ThrushCommonSynthesizerInterface | null = null;
  instrumentId: number = 0;
    
  currentSequenceCommandChannel: number = 0;

  constructor(public channelAllocationManager: ChannelAllocationManager) {
  }

  createInheritedContext() {
    const inheritedAllocation = new ChannelAllocationManager(this.channelAllocationManager);
    const ret = new NoteSequenceContext(inheritedAllocation);
    
    Object.assign(ret, { 
      tempo: this.tempo, 
      synth: this.synth, 
      instrumentId: this.instrumentId 
    });

    return ret;
  }
}

export abstract class CompilableSimplePart {
  abstract compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator;
}

