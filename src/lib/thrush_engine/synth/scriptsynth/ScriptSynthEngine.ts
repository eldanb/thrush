import { ScriptSynthInstrument } from "./ScriptSynthInstrument";
import { ScriptSynthToneGenerator } from "./ScriptSynthToneGenerator";

export type ScriptSynthEngineEvent = {
  time: number;
  channel: number;

  newNote?: {
    instrumentId: number;
    note: number;
  }

  volume?: number;
  panning?: number;
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

  clearQueue(): void {
    this._eventQueue = [];
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
          console.debug(`Play note ${event.newNote.note} at ${currentTime}; instrument = ${event.newNote.instrumentId}; channel = ${event.channel}; latency=${currentTime-event.time}`);
          this._toneGenerator.playNoteOnChannel(event.channel, this._instruments[event.newNote.instrumentId], event.newNote.note);
        }

        if(event.volume != null) {
          this._toneGenerator.setVolumeOnChannel(event.channel, event.volume);
        }

        if(event.panning != null) {
          this._toneGenerator.setPanningOnChannel(event.channel, event.panning);
        }

    }
  }

  public fillSampleBuffer(currentTime: number, leftChannel: Float32Array, rightChannnel: Float32Array, ofs: number, len: number) {
    let curOfs = ofs;
    let remainingLen = len;

    while(remainingLen) {
      //console.debug(`Num events ${this._eventQueue.length}`);
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
}
