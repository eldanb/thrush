import { NativeSynthesizer } from "./synth/native/NativeSynthesizer";
import { ScriptSynthWorkerRpcInterface } from "./synth/scriptsynth/worklet/ScriptSynthWorkerRpcInterface";

export interface ThrushSequenceEvent {
  time: number;
  route(sequencer: ThrushSequencer) : Promise<void>;
}

export abstract class ThrushSequenceGenerator {
  abstract start(sequencer: ThrushSequencer): void;
  abstract nextEvent(): ThrushSequenceEvent | null;
}


export class ThrushSequencer {
  private _sequencerContext: ThrushSequenceGenerator | null = null;
  private _timerId: any = null;
  private _startTime: number = -1;
  private _lastBufferedEvent = -1;

  constructor(private _audioContext: AudioContext,
              private _tsynthToneGenerator: ScriptSynthWorkerRpcInterface,
              private _waveSynth: NativeSynthesizer) {

  }

  async start(sequencerData: ThrushSequenceGenerator): Promise<void> {
    if(this._sequencerContext) {
      await this.stop();
    }

    this._sequencerContext = sequencerData;
    this._sequencerContext.start(this);

    this._startTime = this._audioContext.currentTime;

    this.bufferEvents();
    this._timerId = setInterval(() => { this.bufferEvents() }, 100);
  }


  async stop() {
    if(!this._sequencerContext) {
      return;
    }

    clearInterval(this._timerId);
    this._sequencerContext = null;
    this._timerId = null;

    await this._tsynthToneGenerator.clearEventQueue();
  }

  get tsynthToneGenerator(): ScriptSynthWorkerRpcInterface {
    return this._tsynthToneGenerator;
  }

  get waveTableSynthesizer(): NativeSynthesizer {
    return this._waveSynth;
  }

  private async bufferEvents() {
    while(this._lastBufferedEvent < this._audioContext.currentTime + 3) {
      const nextEvent = this._sequencerContext?.nextEvent();
      if(nextEvent) {
        nextEvent.time += this._startTime;
        await nextEvent.route(this);
        this._lastBufferedEvent = nextEvent.time;
      }
    }
  }
}
