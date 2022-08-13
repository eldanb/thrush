declare type ThrushSequenceGenerationDirective = typeof ThrushSequenceGenerationDirectivez;
declare const ThrushSequenceGenerationDirectivez: unique symbol;

declare type ThrushSequenceGeneratorHandle = typeof ThrushSequenceGeneratorHandlez;
declare const ThrushSequenceGeneratorHandlez: unique symbol;

declare type SynthesizerSelection = 'native' | 'soft';

declare type NoteSettings = {
  volume?: number;
  panning?: number;
}

declare type PartSequenceOptions = {
  synth: SynthesizerSelection;
  instruments: number[];  
  tempo: number;
} & NoteSettings;

declare interface ThrushSequenceGenerationCalls {
  playNote(synth: SynthesizerSelection, channel: number, instrumentId: number, note: number, options?: NoteSettings): ThrushSequenceGenerationDirective;
  changeNote(synth: SynthesizerSelection, channel: number, options?: NoteSettings): ThrushSequenceGenerationDirective;

  delay(time: number): ThrushSequenceGenerationDirective;
  waitFor(eventType: string, eventTarget?: string): ThrushSequenceGenerationDirective;

  cursor(cursor: string, value: any): ThrushSequenceGenerationDirective;
  
  startSequence(generator: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective;
  playSequence(generator: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective;
  
  functionSequence(generator: ThrushSequenceGenerationFunction): ThrushSequenceGeneratorHandle;

  /**
   * Create a sequence based on a musical part.
   * 
   * @remarks
   * 
   * A musical part consists of a sequence of statements. Statements
   * belong to one of the following classes:
   * 
   * - A note of the form [note]#?[octave][timing][loudness]
   *   Where [note] is one of abcdefg, # indicates a sharp note,
   *   [octave] is a single digit octave, and [timing] is a timing spec
   *   (see below). [loudness] can be a sequence of '!'s for forte, or
   *   '@' for piano.
   *  
   * - A pause, of the form [-][timing].      
   * 
   * - A parallel sequence of the form:
   *      ([sequence],[sequence], ...)
   * 
   *   Where [sequence] denotes a sequence of statements. Sequences are 
   *   played in parallel, and the entire parallel sequence ends when 
   *   its longest subsequence ends.
   * 
   * - A parameter change command of the form '[' [parameter][relative][value]... '!'? ']' 
   *   where [parameter] is 'v' for volume, 'p' for panning, 'i' for instrument and 't'
   *   for tempo; relative can be absent to set a constant value for parameter or + to increase,
   *   or - to increase (relative values not supported for 'instrument' selection).
   *   Include an exclamation mark at the end of the command to indicate change should apply
   *   to currently playing note in sequence.
   * 
   * @param partSpecification A string representing the part to play. See remarks for syntax.
   * @param partSequenceOptions Options for part sequence.
   */
  partSequence(partSpecification: string, partSequenceOptions: PartSequenceOptions): ThrushSequenceGeneratorHandle;
}

declare type ThrushSequenceGenerationFunction = (calls: ThrushSequenceGenerationCalls) => Generator<ThrushSequenceGenerationDirective>;

