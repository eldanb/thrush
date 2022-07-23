type ThrushSequenceGenerationDirective = typeof ThrushSequenceGenerationDirectivez;
declare const ThrushSequenceGenerationDirectivez: unique symbol;

declare interface ThrushSequenceGenerationCalls {
  playNoteOnChannel(channel: number, instrumentId: number, note: number): ThrushSequenceGenerationDirective;
  playNoteOnWaveSynthChannel(channel: number, instrumentId: number, note: number): ThrushSequenceGenerationDirective;
  marker(cursor: string, value: any): ThrushSequenceGenerationDirective;
  playGenerator(generator: ThrushSequenceGenerationFunction): ThrushSequenceGenerationDirective;
  delay(time: number): ThrushSequenceGenerationDirective;
}

type ThrushSequenceGenerationFunction = (calls: ThrushSequenceGenerationCalls) => Generator<ThrushSequenceGenerationDirective>;

 