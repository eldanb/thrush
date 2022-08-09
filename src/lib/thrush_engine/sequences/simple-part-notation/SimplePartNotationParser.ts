import { Parser, ParserBuilder, ParserOperators, WhitespaceParser, parse } from 'parzing';
import { NoteSequence } from './NoteSequence';
import { NoteSpecification } from './NoteSpecification';
import { ParallelSequences } from './ParallelSequences';
import { PauseSpecification } from './PauseSpecification';
import { TempoAbsoluteTimingSpecification, TempoRelativeTimingSpecification } from './TimingSpecification';

const pb = new ParserBuilder();

const timingSpec = pb.sequence(
  pb.token("/")._(ParserOperators.omit()),

  pb.choice(        
    pb.sequence(
      pb.anyOf("12345678"),
      pb.optional(pb.token("h"))
    )._(ParserOperators.map(([denom, half]) => new TempoRelativeTimingSpecification(parseInt(denom), half !== null))),

    pb.sequence(
      pb.token('=')._(ParserOperators.omit()),
      pb.many(pb.anyOf("0123456789"))._(ParserOperators.map((s) => parseInt(s.join(''))))
    )._(ParserOperators.map(([time]) => new TempoAbsoluteTimingSpecification(time))),
  ))._(ParserOperators.map((r) => r[0]));

const noteParser = pb.sequence(
    pb.anyOf("abcdefg"),
    pb.optional(pb.token("#")._(ParserOperators.map(() => true))),
    pb.anyOf("012345678")._(ParserOperators.map(parseInt)),
    pb.optional(timingSpec)._(ParserOperators.map(t => t || TempoRelativeTimingSpecification.wholeNote))
  )._(ParserOperators.build(NoteSpecification));


const pauseParser = pb.sequence(
    pb.token("-")._(ParserOperators.omit()),
    timingSpec
  )._(ParserOperators.build(PauseSpecification));

const noteSequence: Parser<NoteSequence> = pb.many(
  pb.choice(
    noteParser,
    pauseParser,
    pb.ref(() => parallelSequences) 
  ), new WhitespaceParser(true), 1
)._(ParserOperators.build(NoteSequence));

const parallelSequences = pb.sequence(
  pb.token('(')._(ParserOperators.omit()),
  pb.many(noteSequence, pb.token(','), 1),
  pb.token(')')._(ParserOperators.omit())  
)._(ParserOperators.build(ParallelSequences))

export function parsePartSequence(partSequence: string): NoteSequence {
  return parse(noteSequence, partSequence);
}