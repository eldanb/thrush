import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushAggregatedSequenceGenerator } from "../ThrushAggregatedSequenceGenerator";
import {  CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";

export class ParallelSequences extends CompilableSimplePart {
  constructor(private _parallelParts: CompilableSimplePart[]) {
    super();
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    
    const parallelGenerators: ThrushSequenceGenerator[] = [];

    this._parallelParts.forEach((part, index) => {     
      const inheritedContext = sequenceContext.createInheritedContext();
      
      const compiledPart = part.compile(inheritedContext);
      if(compiledPart) {
        parallelGenerators.push(compiledPart);
      }
      
    });
    
    return parallelGenerators.length > 1 
      ? new ThrushAggregatedSequenceGenerator(...parallelGenerators)
      : parallelGenerators[0];
  }

}
