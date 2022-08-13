import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushAggregatedSequenceGenerator } from "../ThrushAggregatedSequenceGenerator";
import { ChannelAllocationManager } from "./ChannelAllocationManager";
import {  CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";

export class ParallelSequences extends CompilableSimplePart {
  constructor(private _parallelParts: CompilableSimplePart[]) {
    super();
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    
    const subAllocators: ChannelAllocationManager[] = [];
    const parallelGenerators: ThrushSequenceGenerator[] = [];

    this._parallelParts.forEach((part, index) => {     
      const inheritedContext = sequenceContext.createInheritedContext();
      if(!index) {
        inheritedContext.currentSequenceCommandChannel = sequenceContext.currentSequenceCommandChannel;
      }
      subAllocators.push(inheritedContext.channelAllocationManager)

      const compiledPart = part.compile(inheritedContext);
      if(compiledPart) {
        parallelGenerators.push(compiledPart);
      }
      
    });

    subAllocators.forEach((allocator) => allocator.returnToMaster());
    
    return parallelGenerators.length > 1 
      ? new ThrushAggregatedSequenceGenerator(...parallelGenerators)
      : parallelGenerators[0];
  }

}
