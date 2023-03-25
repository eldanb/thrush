import { Parser, ParserBuilder, ParserOperators, WhitespaceParser, parse } from '@zigsterz/parzing';
import { NoteSequence } from './NoteSequence';
import { NoteChangeRequest, NoteChangeRequestParameter, NoteSpecification } from './NoteSpecification';
import { ParallelSequences } from './ParallelSequences';
import { ParameterChangeCommand, ParameterChangeRequest } from './ParameterChangeCommand';
import { PauseSpecification } from './PauseSpecification';
import { LegatoTimingSpecification, TempoAbsoluteTimingSpecification, TempoRelativeTimingSpecification } from './TimingSpecification';

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
      pb.anyOf("vpitdf"),
      pb.optional(pb.anyOf("+-")),
      pb.regex(/[0-9]{1,10}/)._(map(parseInt))
    )._(build(ParameterChangeRequest))
  ),
  pb.optional(pb.token('!'))._(map(s => s === '!')),
  pb.token(']')._(omit()))._(build(ParameterChangeCommand));
  

const noteChangeSpec =  pb.sequence(
  pb.token('[')._(omit()),
  pb.many(
    pb.sequence(
      pb.sequence(pb.token("@"), pb.regex(/[0-9]+(\.[0-9]+)?/))
        ._(map(([_, reltime]) => parseFloat(reltime))),      
      pb.many(
        pb.sequence(
          pb.anyOf("vpdf"),
          pb.optional(pb.token("!"))._(map(flag => !flag)),
          pb.regex(/[0-9]{1,10}/)._(map(parseInt))
        )._(build(NoteChangeRequestParameter))
      )
    )._(build(NoteChangeRequest))
  ),  
  pb.token(']')._(omit()))._(map(([r]) => r));

const timingSpec = pb.many(
  pb.sequence(
    pb.token("/")._(omit()),

    pb.choice(        
      pb.sequence(
        pb.regex(/[1-8]/),
        pb.optional(pb.token("."))
      )._(map(([denom, half]) => new TempoRelativeTimingSpecification(parseInt(denom), half !== null))),

      pb.sequence(
        pb.token('=')._(omit()),
        pb.regex(/[0-9]{1,10}/)._(map(parseInt))
      )._(map(([time]) => new TempoAbsoluteTimingSpecification(time))),
    ))._(map((r) => r[0])), 

  pb.token("+"), 1)._(map(specifications => 
    specifications.length == 1 
      ? specifications[0] 
      : new LegatoTimingSpecification(specifications)));

const noteParser = pb.sequence(
    pb.anyOf("abcdefg"),
    pb.optional(pb.token("#")._(map(() => true))),
    pb.anyOf("012345678")._(map(parseInt)),
    pb.optional(timingSpec)._(map(t => t || TempoRelativeTimingSpecification.qNote)),
    pb.optional(pb.regex(/\!+|\@+/)),
    pb.optional(noteChangeSpec)
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
