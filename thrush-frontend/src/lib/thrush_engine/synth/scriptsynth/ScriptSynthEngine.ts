import { ScriptSynthInstrument, ScriptSynthWaveInstrument } from "./ScriptSynthInstrument";
import { ScriptSynthToneGenerator } from "./ScriptSynthToneGenerator";

export type ScriptSynthEngineEvent = {
  time: number;
  channelOrNoteId: number | string;

  newNote?: {
    instrumentId: number;
    note: number;
  }

  releaseNote?: boolean;

  volume?: number;
  panning?: number;

  vibrato?: {
    waveform: "none" | "sine";
    frequency: number;
    amplitude: number;    
  }
}

export class ScriptSynthEngine {
  private _eventQueue: ScriptSynthEngineEvent[] = [];
  private _instruments: ScriptSynthInstrument[] = [];

  private _sampleRate: number;
  private _toneGenerator: ScriptSynthToneGenerator;

  constructor(sampleRate: number, numChannels: number) {
    this._toneGenerator =  new ScriptSynthToneGenerator(sampleRate, numChannels);
    this._sampleRate = sampleRate;
  }

  panic(): void {
    this._eventQueue = [];
    this._toneGenerator.panic();
  }

  enqueueEvent(event: ScriptSynthEngineEvent) {
    this._eventQueue.push(event);
  }

  registerInstrument(instrument: ScriptSynthInstrument): number {
    return this._instruments.push(instrument) - 1;
  }

  get toneGenerator(): ScriptSynthToneGenerator {
    return this._toneGenerator;
  }

  private pumpEvents(currentTime: number) {
    while(this._eventQueue.length &&
          this._eventQueue[0].time <= currentTime) {
        const event = this._eventQueue.shift()!;

        if(event.newNote) {
          console.debug(`Play note ${event.newNote.note} at ${currentTime}; instrument = ${event.newNote.instrumentId}; channel = ${event.channelOrNoteId}; latency=${currentTime-event.time}`);
          this._toneGenerator.playNoteOnChannel(event.channelOrNoteId, this._instruments[event.newNote.instrumentId], event.newNote.note);          
        } else 
        if(event.releaseNote) {
          this._toneGenerator.releaseNoteOnChannel(event.channelOrNoteId);
        }

        if(event.volume != null) {
          this._toneGenerator.setVolumeOnChannel(event.channelOrNoteId, event.volume);
        }

        if(event.panning != null) {
          this._toneGenerator.setPanningOnChannel(event.channelOrNoteId, event.panning);
        }

        if(event.vibrato != null) {
          this._toneGenerator.setVibratoOnChannel(event.channelOrNoteId, event.vibrato.waveform, event.vibrato.frequency, event.vibrato.amplitude);
        }

    }
  }

  public fillSampleBuffer(currentTime: number, leftChannel: Float32Array, rightChannnel: Float32Array, ofs: number, len: number) {
    let curOfs = ofs;
    let remainingLen = len;

    while(remainingLen) {
      this.pumpEvents(currentTime);

      const nextEventTime = this._eventQueue[0]?.time;

      const fillSamples =
        nextEventTime != null ?
        Math.min(Math.ceil((nextEventTime - currentTime)) * this._sampleRate, len) :
        len;

      this.toneGenerator.readBuffer(
        leftChannel,
        rightChannnel,
        curOfs,
        fillSamples);

      remainingLen -= fillSamples;
      curOfs += fillSamples;

      currentTime += (fillSamples / this._sampleRate);
    }
  }

  updateInstrument(instrumentHandle: number, instrument: ScriptSynthWaveInstrument) {
    if(this._instruments[instrumentHandle]) {
      this._instruments[instrumentHandle] = instrument;
    }
  }

  deleteInstrument(instrumentHandle: number) {
    (<any>this._instruments[instrumentHandle]) = null;
  }

  enqueueRealtimeEvent(event: ScriptSynthEngineEvent): number {
    const insertIndex = this._eventQueue.findIndex(existingEvent => existingEvent.time > event.time);
    if(insertIndex == -1) {
      this._eventQueue.push(event);
    } else {
      this._eventQueue.splice(insertIndex, 0, event);
    }

    return event.time;
  }
}
