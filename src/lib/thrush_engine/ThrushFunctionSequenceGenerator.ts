import { ThrushSequencer, ThrushSequenceGenerator, ThrushSequenceEvent } from "./ThrushSequencer";

export type ThrushSequenceEventGenerationDirective = (time: number) => ThrushSequenceEvent;
export type ThrushSequenceGenerationDirective = number | ThrushSequenceEventGenerationDirective;
export type ThrushSequenceGenerationFunction = (sequencer: ThrushSequencer) => Generator<ThrushSequenceGenerationDirective>;

export class ThrushFunctionSequenceGenerator extends ThrushSequenceGenerator {
  private _nextEventTime: number = 0;
  private _eventGenerator: Generator<ThrushSequenceGenerationDirective> | null = null;

  constructor(private _sequenceGeneratorFactory: ThrushSequenceGenerationFunction) {
    super();
  }

  start(sequencer: ThrushSequencer): void {
    this._eventGenerator = this._sequenceGeneratorFactory(sequencer);
  }

  nextEvent(): ThrushSequenceEvent | null {
    if(!this._eventGenerator) {
      throw new Error("Sequencer not started!");
    }

    for(;;) {
      const genResult = this._eventGenerator.next();

      if(genResult.done) {
        return null;
      }

      if(typeof(genResult.value) == 'number') {
        this._nextEventTime += genResult.value;
      } else {
        return genResult.value(this._nextEventTime);
      }
    }
  }
}
