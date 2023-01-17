import { Injectable } from '@angular/core';
import { NativeSynthesizer } from 'src/lib/thrush_engine/synth/native/NativeSynthesizer';
import { ScriptSynthesizer } from 'src/lib/thrush_engine/synth/scriptsynth/ScriptSynthesizer';
import { ThrushSequenceGenerator, ThrushSequencer } from 'src/lib/thrush_engine/ThrushSequencer';

@Injectable({
  providedIn: 'root'
})
export class ThrushEngineService {
  private _synthReady = false;
  private _audioContext = new AudioContext();
  private _wavetableSynth = new NativeSynthesizer(this._audioContext, 16);
  private _synthReadyPromise: Promise<void> | null = null;
  private _sequencer: ThrushSequencer | null = null;
  private _audioWorkletNode: ScriptSynthesizer | null = null;
  
  constructor() { }


  async stop() {
    await this._sequencer!.stop();
  }

  resumeAudioContext() {
    this._audioContext.resume();
  }
  
  playSequence(seqContextToPlay: ThrushSequenceGenerator | null) {
    this._audioContext.resume();
    this._sequencer!.start(seqContextToPlay!);
  }

  initialize(): Promise<void> {
    if(!this._synthReadyPromise) {
      this._synthReadyPromise = (async () => {
        this._audioContext.suspend();
      
        await ScriptSynthesizer.loadModuleToContext(this._audioContext);
        console.log("Module loaded");
  
        this._audioWorkletNode = new ScriptSynthesizer(this._audioContext, 16);
        await this._audioWorkletNode.initialize();
  
        this._audioWorkletNode.audioNode.connect(this._audioContext.destination);
        console.log("Node connected");
  
        this._sequencer = new ThrushSequencer(this._audioContext, this._audioWorkletNode, this._wavetableSynth);  
        this._synthReady = true;  
      })();      
    }

    return this._synthReadyPromise;
  }

  get sequencer(): ThrushSequencer {
    return this._sequencer!;
  }

  get ready(): boolean {
    return this._synthReady;
  }  
}
