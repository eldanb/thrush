import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushArraySequenceGenerator } from "../ThrushArraySequenceGenerator";
import { ThrushConcatSequenceGenerator } from "../ThrushConcatSequenceGenerator";
import { CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";

export class NoteSequence extends CompilableSimplePart {
  private _sequenceParts: CompilableSimplePart[];

  constructor(...sequenceParts: CompilableSimplePart[]) {
    super();
    this._sequenceParts = sequenceParts;
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    let selfAllocedChannel = null;
    if(sequenceContext.currentSequenceCommandChannel == null) {
      selfAllocedChannel = sequenceContext.channelAllocationManager.allocateChannel();
      sequenceContext.currentSequenceCommandChannel = selfAllocedChannel;
    }

    let accumulatedArraySequence: ThrushArraySequenceGenerator | null = null;
    let concatenatedSequences: ThrushSequenceGenerator[] = [];
    this._sequenceParts.forEach(command => {
      const compiledSequence = command.compile(sequenceContext);
      if(compiledSequence instanceof ThrushArraySequenceGenerator) {
        if(!accumulatedArraySequence) {
          accumulatedArraySequence = compiledSequence;
          concatenatedSequences.push(accumulatedArraySequence);
        } else {
          accumulatedArraySequence = accumulatedArraySequence.concat(compiledSequence);
          concatenatedSequences[concatenatedSequences.length-1] = accumulatedArraySequence;
        }
      } else {
        accumulatedArraySequence = null;
        if(compiledSequence) {
          concatenatedSequences.push(compiledSequence);
        }
      }
    });

    const compiledResult = 
    concatenatedSequences.length > 1 
        ? new ThrushConcatSequenceGenerator(concatenatedSequences)
        : concatenatedSequences[0];

    if(selfAllocedChannel) {
      sequenceContext.channelAllocationManager.releaseChannel(selfAllocedChannel);
    }
    
    return compiledResult;
  }
}
