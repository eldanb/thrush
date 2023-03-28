import { WaveFormGenerator, WaveFormGeneratorFactories, WaveFormType } from "../common/WaveFormGenerators";
import { IScriptSynthInstrumentNoteGenerator, ScriptSynthInstrument } from "./ScriptSynthInstrument";

class ChannelState  {

  toneGenerator: ScriptSynthToneGenerator;
  playingNoteId: string | null = null;

  noteSampleGenerator: IScriptSynthInstrumentNoteGenerator | null = null; 

  volume: number = 0;
  panning: number = 0.5;
  pitchBend: number = 0;
  vibratoGenerator: WaveFormGenerator | null = null;

  constructor(toneGenerator: ScriptSynthToneGenerator) {
    this.toneGenerator = toneGenerator;
  }

  playNote(instrument: ScriptSynthInstrument, note: number, startSampleNumber: number) {
    this.noteSampleGenerator = instrument.createNoteGenerator(note, this.toneGenerator.outputSampleRate, startSampleNumber);
    if(this.noteSampleGenerator) {
      this.noteSampleGenerator.setPanning(this.panning);
      this.noteSampleGenerator.setVolume(this.volume);
      this.noteSampleGenerator.setPitchBend(this.pitchBend);
      this.noteSampleGenerator.setVibratorGenerator(this.vibratoGenerator);
    }
  }

  releaseNote(releaseSampleNumber: number) {
    if(this.noteSampleGenerator) {
      this.noteSampleGenerator.releaseNote(releaseSampleNumber);
    }
    this.playingNoteId = null;
  }
  setVibratoGenerator(vibratorGenerator: WaveFormGenerator | null) {
    this.vibratoGenerator = vibratorGenerator;
    if(this.noteSampleGenerator) {
      this.noteSampleGenerator.setVibratorGenerator(this.vibratoGenerator);
    }    
  }

  setPanning(panning: number) {
    this.panning = panning;
    if(this.noteSampleGenerator) {
      this.noteSampleGenerator.setPanning(panning);
    }    
  }

  setPitchBend(pitchBend: number) {
    this.pitchBend = pitchBend;
    if(this.noteSampleGenerator) {
      this.noteSampleGenerator.setPitchBend(this.pitchBend);
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    if(this.noteSampleGenerator) {
      this.noteSampleGenerator.setVolume(volume);
    }        
  }
}

export class ScriptSynthToneGenerator {
  private _sampleRate: number;
  private _channelStates: ChannelState[];
  private _currentTime: number = 0;
  private _currentSample: number = 0;

  constructor(sampleRate: number, private _numChannels: number) {
    this._channelStates = [];
    
    this.panic();

    this._sampleRate = sampleRate;
  }

  public panic() {
    for(let channelIdx=0; channelIdx<this._numChannels; channelIdx++) {
      this._channelStates[channelIdx] = new ChannelState(this);
    }    
  }

  public playNoteOnChannel(channelOrNoteId: number | string, instrument: ScriptSynthInstrument, note: number) {    
    let channelState: ChannelState | undefined;
    if(typeof(channelOrNoteId) == "string") {
      channelState = this._channelStates.find(channelState => !channelState.noteSampleGenerator);
      if(!channelState) {
        console.warn("No free channel!");
        channelState = this._channelStates[0];
      }
      channelState.playingNoteId = channelOrNoteId;
      channelState.vibratoGenerator = null;
    } else {
      channelState = this._channelStates[channelOrNoteId];
      channelState.playingNoteId = null;
    }
      
    channelState.playNote(instrument, note, this._currentSample);
  }

  public setVolumeOnChannel(channelOrNoteId: number | string, volume: number) {
    const channelState = this._getChannelState(channelOrNoteId);
    channelState.setVolume(volume);
  }

  public setPanningOnChannel(channelOrNoteId: number | string, panning: number) {
    const channelState = this._getChannelState(channelOrNoteId);
    channelState.setPanning(panning);
  }

  public setPitchBendOnChannel(channelOrNoteId: number | string, pitchBend: number) {
    const channelState = this._getChannelState(channelOrNoteId);
    channelState.setPitchBend(pitchBend);
  }

  public setVibratoOnChannel(channelOrNoteId: number | string, waveform: "none" | WaveFormType, frequency: number, amplitude: number) {
    const channelState = this._getChannelState(channelOrNoteId);
    channelState.setVibratoGenerator(waveform === "none"
      ? null
      : WaveFormGeneratorFactories[waveform](this._currentTime, amplitude, frequency));          
  }

  public releaseNoteOnChannel(channelOrNoteId: number | string): void {
    const channelState = this._getChannelStateOrNull(channelOrNoteId);
    if(channelState) {
      channelState.releaseNote(this._currentSample);
    }
  }

  private _getChannelStateOrNull(channelOrNoteId: number | string): ChannelState | undefined {
    return (typeof(channelOrNoteId) == 'number')
      ? this._channelStates[channelOrNoteId]
      : this._channelStates.find(cs => cs.playingNoteId == channelOrNoteId);
  }
  
  private _getChannelState(channelOrNoteId: number | string): ChannelState {
    const ret = this._getChannelStateOrNull(channelOrNoteId);
    if(!ret) {
      throw new Error(`Note ID not found: ${channelOrNoteId}`);
    }

    return ret;        
  }

  public readBuffer(destinationLeft: Float32Array, destinationRight: Float32Array, destOffset: number, destLength: number): void
  {
    let currentSample = this._currentSample;
    for(let sampleIndex=destOffset; sampleIndex<destOffset+destLength; sampleIndex++)
    {
      const leftAndRightSample = [0, 0];
      const channels = this._channelStates.length;
      const currentTime = this._currentTime;

      for(let channelIndex=0; channelIndex<channels; channelIndex++) {
        const channelState = this._channelStates[channelIndex];
        if(channelState.noteSampleGenerator) {
          if(!channelState.noteSampleGenerator.getNoteSample(currentSample, currentTime, leftAndRightSample)) {
            channelState.noteSampleGenerator = null;
            channelState.playingNoteId = null;
          }
        }
      }

      destinationLeft[sampleIndex] = leftAndRightSample[0];
      destinationRight[sampleIndex] = leftAndRightSample[1];

      currentSample++;      
    }

    this._currentSample = currentSample;
    this._currentTime = this._currentSample / this._sampleRate;
  }

  get outputSampleRate(): number {
    return this._sampleRate;
  }
}
