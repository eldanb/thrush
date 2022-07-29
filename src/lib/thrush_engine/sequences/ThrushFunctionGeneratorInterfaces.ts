type ThrushSequenceGenerationDirective = typeof ThrushSequenceGenerationDirectivez;
declare const ThrushSequenceGenerationDirectivez: unique symbol;

type ThrushSequenceGeneratorHandle = typeof ThrushSequenceGeneratorHandlez;
declare const ThrushSequenceGeneratorHandlez: unique symbol;

type SynthesizerSelection = 'native' | 'soft';

type NoteSettings = {
  volume?: number;
  panning?: number;
}

declare interface ThrushSequenceGenerationCalls {
  playNote(synth: SynthesizerSelection, channel: number, instrumentId: number, note: number, options?: NoteSettings): ThrushSequenceGenerationDirective;
  changeNote(synth: SynthesizerSelection, channel: number, options?: NoteSettings): ThrushSequenceGenerationDirective;

  delay(time: number): ThrushSequenceGenerationDirective;
  waitFor(eventType: string, eventTarget?: string): ThrushSequenceGenerationDirective;

  cursor(cursor: string, value: any): ThrushSequenceGenerationDirective;
  
  startSequence(generator: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective;
  playSequence(generator: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective;
  
  functionSequence(generator: ThrushSequenceGenerationFunction): ThrushSequenceGeneratorHandle;

}

type ThrushSequenceGenerationFunction = (calls: ThrushSequenceGenerationCalls) => Generator<ThrushSequenceGenerationDirective>;

