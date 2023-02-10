
/**
 * An opaque type describing a CodeSynth sequence generation directive.
 */
 declare type ThrushSequenceGenerationDirective = typeof ThrushSequenceGenerationDirective;
declare const ThrushSequenceGenerationDirective: unique symbol;


/**
 * A handle to a sequence generator. 
 */
declare type ThrushSequenceGeneratorHandle = typeof ThrushSequenceGeneratorHandle;
declare const ThrushSequenceGeneratorHandle: unique symbol;

/**
 * Identifies one of the Thrush synthesizers.
 */
declare type SynthesizerSelection = 'native' | 'soft';

/**
 * Note playing options.
 */
declare type NoteSettings = {
  /**
   * Volume to play note at. Between 0-1.
   */
  volume?: number;
  
  /**
   * Panning of played note. 0 for left, 1 for right, 0.5 for middle.
   */  
  panning?: number;
}

/**
 * Option settings for a simple notation part sequence.  
 */
declare type PartSequenceOptions = {

  /**
   * Synthesizer to play the part on.
   */
  synth: SynthesizerSelection;

  /**
   * An array of instruments. Part instructions that refer to an insturment, such as `[i...]`, refer to an 
   * index into this array to identify the insturment.
   */
  instruments: string[];  

  /**
   * Tempo -- the length of a beat in seconds for timing.
   */
  tempo: number;

  /**
   * Initial default note settings.
   */
  defaultNoteSettings?: NoteSettings;
};


/**
 * A ChannelOrNoteId is used to refer to a channel in a synthesizer. 
 * If a number if specified, this is taken to be the channel number to operate on.
 * If a string note ID is specified, then for note-playing commands a non-busy channel is allocated
 * (or a busy one if there are no non-busy channels) and assigned the note ID; for other commands
 * the channel currently assigned the specified note ID (if any) is taken.
 */
declare type ChannelOrNoteId = number | string;

/**
 * CodeSynth generator functions are invoked with an instance of <code>ThrushSequenceGenerationCalls</code>,
 * which provides APIs for creating directives and utilities.
 */
declare interface ThrushSequenceGenerationCalls {

  /**
   * Create a directive to play a note.
   * 
   * The generator function should yield the returned directive for it to take effect.
   * The note will be played on the "current time" maintained by the 
   * CodeSynth generator when the directive is yielded.
   * 
   * This directive does not advance the generator's current time.
   * 
   * @param synth Synthesizer to play the note on.
   * @param channel Channel in the synthesizer to use to play the note. Each channel can play a single note at a time.
   * @param instrumentId Instrument to use for the played note.
   * @param note Note to play. Expressed as the number of semitones from c0.
   * @param options Settings for played note. 
   */
  playNote(synth: SynthesizerSelection, channel: ChannelOrNoteId, instrumentId: string, note: number, options?: NoteSettings): ThrushSequenceGenerationDirective;

  /**
   * Create a directive to change note settings for a note previously trigged by <code>playNote</code>. 
   * 
   * The generator function should yield the returned directive for it to take effect.
   * The note change will occur on the "current time" maintained by the CodeSynth generator when 
   * the directive is yielded.
   * 
   * This directive does not advance the generator's current time.
   * 
   * 
   * @param synth Synthesizer on which the changed note is currently playing.
   * @param channel Channel in the synthesizer playing the note to change.
   * @param options Updated settings for played note. 
   */
  changeNote(synth: SynthesizerSelection, channel: ChannelOrNoteId, options?: NoteSettings): ThrushSequenceGenerationDirective;

  /**
   * Create a directive to release a note.
   * 
   * The generator function should yield the returned directive for it to take effect.
   * The note played in the idnetified channel will be released (no longer played.)
   * 
   * This directive does not advance the generator's current time.
   * 
   * @param synth Synthesizer to play the note on.
   * @param channel Channel in the synthesizer playing the note to be released.
   */
   releaseNote(synth: SynthesizerSelection, channel: ChannelOrNoteId): ThrushSequenceGenerationDirective;

  /**
   * Create a directive to emit a cursor value change event. 
   * 
   * The generator function should yield the returned directive for it to take effect.
   * The event will be published on the "current time" maintained by the CodeSynth 
   * generator when this directive is yielded. 
   * 
   * This directive does not advance the generator's current time.
   * 
   * @param cursor Name of cursor to publish a cursor value change event for.
   * @param value New value to publish for cursor identifed by <code>cursor</code>.
   */
  cursor(cursor: string, value: any): ThrushSequenceGenerationDirective;

  /**
   * Create a directive to advance the current time maintained by the CodeSynth generator.
   * This will affect the time of events geenrated by subsequently yielded directives.
   * 
   * The generator function should yield the returned directive for it to take effect.
   * 
   * @param time Number of seconds by which the current time should be advanved.
   */
  delay(time: number): ThrushSequenceGenerationDirective;

  /**
   * Create a directive to wait for an event of a specific type and target to be published.
   * 
   * The generator function should yield the returned directive for it to take effect.
   * 
   * This will suspend event generation by the sequence until an event is observed. When the
   * event is observed, the current time of the generator will be set to the observed event's time
   * and generator execution will resume. 
   * 
   * @param eventType Type of event to wait for
   * @param eventTarget Target of event to wait for. If not specified, any event of type <code>eventType</code> will 
   * release the wait.
   */
   waitFor(eventType: string, eventTarget?: string): ThrushSequenceGenerationDirective;
  

  /**
   * Create a directive to asynchronously invoke a sub-sequence. 
   * 
   * The generator function should yield the returned directive for it to take effect. On the "current time"
   * maintained by the sequence generator at the time of yielding the directive, events from the provided invoked
   * sequence will start to be played -- time shufted to the current time at the time of directive yield. The generator
   * resumes execution in parallel and any events that it generates will play as well.
   * 
   * This directive does not advance the generator's current time. 
   * 
   * Note that a CodeSynth sequence completes only after any sub-sequence that invoked completes.
   * 
   * @param generator Sequence generator to invoke.
   */
  startSequence(generator: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective;


   /**
   * Create a directive to synchronously invoke a sub-sequence. 
   * 
   * The generator function should yield the returned directive for it to take effect. On the "current time"
   * maintained by the sequence generator at the time of yielding the directive, the generator function will
   * be suspended and events from the provided sequence will be played -- time shufted to the current time 
   * at the time of directive yield. Once the events in the invoked sequence are exhausted, the generator
   * resumes execution having its current time set to the time of the last event in the invoked sequence.   
   * 
   * @param generator Sequence generator to invoke.
   */
  playSequence(generator: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective;
  
  /**
   * Create a CodeSynth sequence generator. 
   * 
   * Creates a CodeSynth sequence generator given a sequence generator function. The returned seqeunce generator
   * can be used with sequence invocation calls such as <code>playSequence</code>.
   * 
   * The sequence generator function must be a JavaScript generator function, and it receives an instance
   * of <code>ThrushSequenceGenerationCalls</code> as its single argument. It must use that instance to invoke
   * CodeSynth services, and not any other instance visible to it.
   * 
   * @param generator Sequence generator function.
   */
  functionSequence(generator: ThrushSequenceGenerationFunction): ThrushSequenceGeneratorHandle;

  /**
   * Create a sequence based on a musical part specified in simple notation.
   * 
   * @remarks
   * 
   * A musical part consists of a sequence of statements. Statements
   * belong to one of the following classes:
   * 
   * - A note of the form `[note]'#'?[octave][timing][loudness-modifiers]`
   *   Where `[note]` is one of `abcdefg`, `#` indicates a sharp note,
   *   `[octave]` is a single digit octave, and `[timing]` is a timing spec
   *   (see below). `[loudness-modifiers]` can be a sequence of `!` for forte, or
   *   `@` for piano.
   *  
   * - A pause, of the form `'-'[timing]`.      
   * 
   * - A parallel sequence of the form:
   *      `([sequence],[sequence], ...)`
   * 
   *   Where `[sequence]` denotes a sequence of statements. Sequences are 
   *   played in parallel, and the entire parallel sequence ends when 
   *   its longest subsequence ends. 
   *   You can also use a single parallel sequence together with the parameter
   *   change command (see below) to change parameters only for the length of the sequence.
   * 
   * - A parameter change command of the form `'['[parameter][relative][value]...'!'?']'` 
   *   where `[parameter]` is `v` for volume, `p` for panning, `i` for instrument, `t`
   *   for tempo, `d` for vibrato depth, and `f` for vibrato frequency; relative can be absent 
   *   to set a constant value for parameter or `+` to increase,
   *   or `-` to increase (relative values not supported for instrument selection).
   *   Include an exclamation mark at the end of the command to indicate change should apply
   *   to currently playing note in sequence.
   * 
   * @param partSpecification A string representing the part to play. See remarks for syntax.
   * @param partSequenceOptions Options for part sequence.
   */
  partSequence(partSpecification: string, partSequenceOptions: PartSequenceOptions): ThrushSequenceGeneratorHandle;
}

declare type ThrushSequenceGenerationFunction = (calls: ThrushSequenceGenerationCalls) => Generator<ThrushSequenceGenerationDirective>;

