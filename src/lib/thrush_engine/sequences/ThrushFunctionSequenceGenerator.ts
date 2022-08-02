/// <reference path="./ThrushFunctionGeneratorInterfaces.ts"/>
import { ThrushAggregatedSequenceGenerator } from "./ThrushAggregatedSequenceGenerator";
import { ThrushSequencer, ThrushSequenceGenerator, ThrushSequenceEvent, ThrushSequenceMarkerEvent, ThrushSequenceEndEvent } from "../ThrushSequencer";
import { ThrushCommonSynthesizerEvent } from "../ThrushSynthesizerInterface";
import { ThrushTimeOffsetSequenceGenerator } from "../sequences/ThrushTimeOffsetSequenceGenerator";
import { ThrushWaitForEventSequence } from "./ThrushWaitForEventSequence";

export type ThrushSequenceGenerationDirectiveEvent = {
  type: 'event';
  event: ThrushSequenceEvent;
}

export type ThrushSequenceGenerationDirectiveCallGenerator = {
  type: 'call_generator';
  generator: ThrushSequenceGenerator;
}

export type ThrushSequenceGenerationDirectiveStartGenerator = {
  type: 'start_generator';
  generator: ThrushSequenceGenerator;
}

export type ThrushSequenceGenerationDirectiveDelay = {
  type: 'delay';
  delay: number;
}

export type InternalThrushSequenceGenerationDirective = 
  ThrushSequenceGenerationDirectiveEvent | 
  ThrushSequenceGenerationDirectiveCallGenerator | 
  ThrushSequenceGenerationDirectiveStartGenerator | 
  ThrushSequenceGenerationDirectiveDelay;

export class ThrushFunctionSequenceGenerator extends ThrushSequenceGenerator {
  private _sequencer: ThrushSequencer | null = null;
  private _nextEventTime: number = 0;
  private _eventGenerator: Generator<ThrushSequenceGenerationDirective> | null = null;
  private _calledGenerator: ThrushSequenceGenerator | null = null;
  
  constructor(
    private _sequenceGeneratorFactory: ThrushSequenceGenerationFunction,
    private _aggregator: ThrushAggregatedSequenceGenerator) {
    super();
  }

  start(sequencer: ThrushSequencer): void {  
    this._sequencer = sequencer;  
    this._calledGenerator = null;
    this._nextEventTime = 0;
    this._eventGenerator = this._sequenceGeneratorFactory(new ThrushSequenceGenerationCallsImpl(sequencer, this._aggregator));
  }
  
  nextEvent(): ThrushSequenceEvent | null {
    if(!this._eventGenerator) {
      throw new Error("Sequencer not started!");
    }

    for(;;) {
      if(this._calledGenerator) {
        const nextEvent = this._calledGenerator.nextEvent();
        if(nextEvent instanceof ThrushSequenceEndEvent) {
          this._calledGenerator = null;
          this._nextEventTime = nextEvent.time;
        } else {
          return nextEvent;
        }
      }

      const genResult = this._eventGenerator.next() as unknown as IteratorResult<InternalThrushSequenceGenerationDirective>;

      if(genResult.done) {
        return new ThrushSequenceEndEvent(this._nextEventTime);
      }

      switch(genResult.value.type) {
        case "event":
          const event = genResult.value.event;
          event.time = this._nextEventTime;
          return event;

        case "start_generator":
          this._aggregator.addChild(new ThrushTimeOffsetSequenceGenerator(genResult.value.generator, this._nextEventTime));
          break;

        case "call_generator":
          this._calledGenerator = new ThrushTimeOffsetSequenceGenerator(genResult.value.generator, this._nextEventTime);          
          this._calledGenerator.start(this._sequencer!);
          break;
  
        case "delay":
          this._nextEventTime += genResult.value.delay;
          break;
      }
    }
  }

  postEvent(time: number, eventType: string, eventTarget: string, value: any): void {
      if(this._calledGenerator) {
        this._calledGenerator.postEvent(time, eventType, eventTarget, value);
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

  cursor(cursor: string, value: any): ThrushSequenceGenerationDirective {
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

  startSequence(sequence: ThrushSequenceGeneratorHandle): typeof ThrushSequenceGenerationDirectivez {
    const typedSequence = sequence as unknown as ThrushSequenceGenerator;
    return this.internalEventToDirective({
      type: "start_generator",
      generator: typedSequence
    });
  }

  functionSequence(generator: ThrushSequenceGenerationFunction): ThrushSequenceGeneratorHandle {
    const childAggregator = new ThrushAggregatedSequenceGenerator();    
    childAggregator.addInitialChild(new ThrushFunctionSequenceGenerator(generator, childAggregator));
    return childAggregator as unknown as ThrushSequenceGeneratorHandle;
  }
    
  delay(time: number): ThrushSequenceGenerationDirective {
    return this.internalEventToDirective({
      type: 'delay',
      delay: time
    });
  }

  waitFor(eventType: string, eventTarget?: string): ThrushSequenceGenerationDirective {
    return this.internalEventToDirective({
      type: "call_generator",
      generator: new ThrushWaitForEventSequence(0, eventType, eventTarget)
    });
  }

  private internalEventToDirective(event: InternalThrushSequenceGenerationDirective): ThrushSequenceGenerationDirective {
    return event as unknown as ThrushSequenceGenerationDirective;
  }
}

