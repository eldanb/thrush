/// <reference path="./ThrushFunctionGeneratorInterfaces.ts"/>
import { ThrushAggregatedSequenceGenerator } from "./ThrushAggregatedSequenceGenerator";
import { ThrushSequencer, ThrushSequenceGenerator, ThrushSequenceEvent, ThrushSequenceMarkerEvent } from "./ThrushSequencer";
import { ThrushCommonSynthesizerEvent } from "./ThrushSynthesizerInterface";
import { ThrushTimeOffsetSequenceGenerator } from "./ThrushTimeOffsetSequenceGenerator";

export type ThrushSequenceGenerationDirectiveEvent = {
  type: 'event';
  event: ThrushSequenceEvent;
}

export type ThrushSequenceGenerationDirectiveCallGenerator = {
  type: 'call_generator';
  generator: ThrushSequenceGenerator;
}

export type ThrushSequenceGenerationDirectiveDelay = {
  type: 'delay';
  delay: number;
}

export type InternalThrushSequenceGenerationDirective = 
  ThrushSequenceGenerationDirectiveEvent | 
  ThrushSequenceGenerationDirectiveCallGenerator | 
  ThrushSequenceGenerationDirectiveDelay;

export class ThrushFunctionSequenceGenerator extends ThrushSequenceGenerator {
  private _nextEventTime: number = 0;
  private _eventGenerator: Generator<ThrushSequenceGenerationDirective> | null = null;
  
  constructor(
    private _sequenceGeneratorFactory: ThrushSequenceGenerationFunction,
    private _aggregator: ThrushAggregatedSequenceGenerator) {
    super();
  }

  start(sequencer: ThrushSequencer): void {    
    this._eventGenerator = this._sequenceGeneratorFactory(new ThrushSequenceGenerationCallsImpl(sequencer, this._aggregator));
  }

  
  nextEvent(): ThrushSequenceEvent | null {
    if(!this._eventGenerator) {
      throw new Error("Sequencer not started!");
    }

    for(;;) {
      const genResult = this._eventGenerator.next() as unknown as IteratorResult<InternalThrushSequenceGenerationDirective>;

      if(genResult.done) {
        return null;
      }

      switch(genResult.value.type) {
        case "event":
          const event = genResult.value.event;
          event.time = this._nextEventTime;
          return event;
          break;

        case "call_generator":
          this._aggregator.addChild(new ThrushTimeOffsetSequenceGenerator(genResult.value.generator, this._nextEventTime));
          break;

        case "delay":
          this._nextEventTime += genResult.value.delay;
          break;
      }
    }
  }
}


class ThrushSequenceGenerationCallsImpl implements ThrushSequenceGenerationCalls {
  constructor(private _sequencer: ThrushSequencer, private _aggregator: ThrushAggregatedSequenceGenerator) {

  }

  playNote(synth: SynthesizerSelection, channel: number, instrumentId: number, note: number, options?: NoteSettings): ThrushSequenceGenerationDirective {
    return this.internalEventToDirective({
      type: 'event',
      event: new ThrushCommonSynthesizerEvent(
        0, 
        synth === 'soft' ? this._sequencer.tsynthToneGenerator : this._sequencer.waveTableSynthesizer,  
        channel, 
        {
          newNote: {
            instrumentId,
            note
          },
          ...options
        })
    });
  }

  changeNote(synth: SynthesizerSelection, channel: number, options: NoteSettings): ThrushSequenceGenerationDirective {
    return this.internalEventToDirective({
      type: 'event',
      event: new ThrushCommonSynthesizerEvent(
        0, 
        synth === 'soft' ? this._sequencer.tsynthToneGenerator : this._sequencer.waveTableSynthesizer,  
        channel, 
        options)
    });
  }

  marker(cursor: string, value: any): ThrushSequenceGenerationDirective {
    return this.internalEventToDirective({
      type: 'event',
      event: new ThrushSequenceMarkerEvent(0, cursor, value)
    });
  }

  playSequence(sequence: ThrushSequenceGeneratorHandle): ThrushSequenceGenerationDirective {
    const typedSequence = sequence as unknown as ThrushSequenceGenerator;
    return this.internalEventToDirective({
      type: "call_generator",
      generator: typedSequence
    });
  }

  functionSequence(generator: ThrushSequenceGenerationFunction): ThrushSequenceGeneratorHandle {
    return new ThrushFunctionSequenceGenerator(generator, this._aggregator) as unknown as ThrushSequenceGeneratorHandle;
  }
    
  delay(time: number): ThrushSequenceGenerationDirective {
    return this.internalEventToDirective({
      type: 'delay',
      delay: time
    });
  }

  private internalEventToDirective(event: InternalThrushSequenceGenerationDirective): ThrushSequenceGenerationDirective {
    return event as unknown as ThrushSequenceGenerationDirective;
  }
}

