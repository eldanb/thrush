import { ThrushSequenceGenerator } from "../../ThrushSequencer";
import { ThrushConcatSequenceGenerator } from "../ThrushConcatSequenceGenerator";
import { CompilableSimplePart, NoteSequenceContext } from "./SimplePartNotationModel";

export class NoteSequence extends CompilableSimplePart {
  private _sequenceParts: CompilableSimplePart[];

  constructor(...sequenceParts: CompilableSimplePart[]) {
    super();
    this._sequenceParts = sequenceParts;
  }

  compile(sequenceContext: NoteSequenceContext): ThrushSequenceGenerator {
    const seqChannel = sequenceContext.channelAllocationManager.allocateChannel();
    sequenceContext.currentSequenceCommandChannel = seqChannel;

    const compiledResult = 
      new ThrushConcatSequenceGenerator(this._sequenceParts.map(command => command.compile(sequenceContext)));

    sequenceContext.channelAllocationManager.releaseChannel(seqChannel);
    
    return compiledResult;
  }
}
