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

    this._parallelParts.forEach((part) => {     
      const inheritedContext = sequenceContext.createInheritedContext();
      subAllocators.push(inheritedContext.channelAllocationManager)

      parallelGenerators.push(part.compile(inheritedContext));
    });

    subAllocators.forEach((allocator) => allocator.returnToMaster());

    return new ThrushAggregatedSequenceGenerator(
      ...parallelGenerators
    )
  }

}
