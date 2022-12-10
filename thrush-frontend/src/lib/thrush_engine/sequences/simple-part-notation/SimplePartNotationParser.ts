import { Parser, ParserBuilder, ParserOperators, WhitespaceParser, parse } from '@zigsterz/parzing';
import { NoteSequence } from './NoteSequence';
import { NoteSpecification } from './NoteSpecification';
import { ParallelSequences } from './ParallelSequences';
import { ParameterChangeCommand, ParameterChangeRequest } from './ParameterChangeCommand';
import { PauseSpecification } from './PauseSpecification';
import { TempoAbsoluteTimingSpecification, TempoRelativeTimingSpecification } from './TimingSpecification';

import map = ParserOperators.map
import omit = ParserOperators.omit;
import build = ParserOperators.build;
import whitespace = ParserOperators.whitespace;

const pb = new ParserBuilder();
const nmws = new WhitespaceParser(false);

const paramChangeCommand = pb.sequence(
  pb.token('[')._(omit()),
  pb.many(
    pb.sequence(
      pb.anyOf("vpit"),
      pb.optional(pb.anyOf("+-")),
      pb.anyOf("0123456789", 1, 10)._(map(parseInt))
    )._(build(ParameterChangeRequest))
  ),
  pb.optional(pb.token('!'))._(map(s => s === '!')),
  pb.token(']')._(omit()))._(build(ParameterChangeCommand));
  
const timingSpec = pb.sequence(
  pb.token("/")._(omit()),

  pb.choice(        
    pb.sequence(
      pb.anyOf("12345678"),
      pb.optional(pb.token("."))
    )._(map(([denom, half]) => new TempoRelativeTimingSpecification(parseInt(denom), half !== null))),

    pb.sequence(
      pb.token('=')._(omit()),
      pb.many(pb.anyOf("0123456789"))._(map((s) => parseInt(s.join(''))))
    )._(map(([time]) => new TempoAbsoluteTimingSpecification(time))),
  ))._(map((r) => r[0]));

const noteParser = pb.sequence(
    pb.anyOf("abcdefg"),
    pb.optional(pb.token("#")._(map(() => true))),
    pb.anyOf("012345678")._(map(parseInt)),
    pb.optional(timingSpec)._(map(t => t || TempoRelativeTimingSpecification.qNote)),
    pb.optional(
      pb.choice(
        pb.anyOf("!", 1),
        pb.anyOf("@", 1)))
  )._(build(NoteSpecification));

const pauseParser = pb.sequence(
    pb.token("-")._(omit()),
    timingSpec
  )._(build(PauseSpecification));

const noteSequence: Parser<NoteSequence> = pb.many(
  pb.choice(
    noteParser,
    pauseParser,
    paramChangeCommand,
    pb.ref(() => parallelSequences) 
  ), undefined, 1
)._(whitespace(nmws))._(build(NoteSequence));

const parallelSequences = pb.sequence(
  pb.token('(')._(omit()),
  pb.many(noteSequence, pb.token(','), 1)._(whitespace(nmws)),
  pb.token(')')._(omit())  
)._(whitespace(nmws))._(build(ParallelSequences))

export function parsePartSequence(partSequence: string): NoteSequence {
  return parse(noteSequence, partSequence);
}
