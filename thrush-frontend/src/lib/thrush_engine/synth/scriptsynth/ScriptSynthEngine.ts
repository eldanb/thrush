import { ScriptSynthInstrument } from "./ScriptSynthInstrument";
import { FmAlgorithmNode, ScriptSynthFmInstrument } from "./ScriptSynthInstrumentFm";
import { ScriptSynthToneGenerator } from "./ScriptSynthToneGenerator";

export type ScriptSynthEngineEvent = {
  time: number;
  channelOrNoteId: number | string;

  newNote?: {
    instrumentId: string;
    note: number;
  }

  releaseNote?: boolean;

  volume?: number;
  panning?: number;
  pitchBend?: number;

  vibrato?: {
    waveform: "none" | "sine";
    frequency: number;
    amplitude: number;    
  }
}

export class ScriptSynthEngine {
  private _eventQueue: ScriptSynthEngineEvent[] = [];
  private _instruments: { [id: string]: ScriptSynthInstrument } = {};

  private _sampleRate: number;
  private _toneGenerator: ScriptSynthToneGenerator;

  constructor(sampleRate: number, numChannels: number) {
    this._toneGenerator =  new ScriptSynthToneGenerator(sampleRate, numChannels);
    this._sampleRate = sampleRate;

    this._instruments['fm_sample'] = new ScriptSynthFmInstrument(
      new FmAlgorithmNode('sine', false, 1, [{ time: 0, value: 1 }, { time: 1, value: 0 }], [{ time: 1, value: 0 }], 0, [
        new FmAlgorithmNode('sine', false, 3, [{time: 0, value: 0.27}, {time: 2, value: 0.22}], [], 0, [
          new FmAlgorithmNode('sine', false, 7, [{time: 0, value: 0.5 }, {time: 0.030, value: 0.23}], [], 0, [
            new FmAlgorithmNode('sine', false, 16, [{time: 0, value: 0.37 }, {time: 0.05, value: 0.20}], [], 0, [])
          ])
        ])
      ]),
      undefined, 
      {
        chorusScaling: 0.002,
        chorusMixLevel: 0.4,
        chorusDelay: 0.003,
        chorusLfoFrequency: 6.0
      }
    );
  }

  panic(): void {
    this._eventQueue = [];
    this._toneGenerator.panic();
  }

  enqueueEvent(event: ScriptSynthEngineEvent) {
    this._eventQueue.push(event);
  }

  registerInstrument(instrumentId: string, instrument: ScriptSynthInstrument): void {
    this._instruments[instrumentId] = instrument;
  }

  get toneGenerator(): ScriptSynthToneGenerator {
    return this._toneGenerator;
  }

  private pumpEvents(currentTime: number) {
    while(this._eventQueue.length &&
          this._eventQueue[0].time <= currentTime) {
        const event = this._eventQueue.shift()!;

        try {
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
          
          if(event.pitchBend != null) {
            this._toneGenerator.setPitchBendOnChannel(event.channelOrNoteId, event.pitchBend);
          }

          if(event.vibrato != null) {
            this._toneGenerator.setVibratoOnChannel(event.channelOrNoteId, event.vibrato.waveform, event.vibrato.frequency, event.vibrato.amplitude);
          }
        } catch(e) {
          console.warn(`Error processing event ${JSON.stringify(event)}: ${e}`);
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
        Math.min(Math.ceil((nextEventTime - currentTime) * this._sampleRate), remainingLen) :
        remainingLen;

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

  deleteInstrument(instrumentId: string) {
    delete this._instruments[instrumentId];
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
