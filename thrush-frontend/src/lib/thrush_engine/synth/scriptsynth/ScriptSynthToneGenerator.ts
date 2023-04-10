import { WaveFormGenerator, WaveFormGeneratorFactories, WaveFormType } from "../common/WaveFormGenerators";
import { IScriptSynthInstrumentFilter, IScriptSynthInstrumentNoteGenerator, ScriptSynthInstrument } from "./ScriptSynthInstrument";

class ChannelState  {

  toneGenerator: ScriptSynthToneGenerator;
  playingNoteId: string | null = null;

  noteSampleGenerator: IScriptSynthInstrumentNoteGenerator | null = null; 
  ownerInstrumentState: InstrumentChannelStates | null = null;

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

type InstrumentChannelStates = {
  instrument: ScriptSynthInstrument;
  filterState: IScriptSynthInstrumentFilter | null;
  channelStates: ChannelState[];
}

export class ScriptSynthToneGenerator {
  private _sampleRate: number;
  private _channelStates: ChannelState[];
  private _currentTime: number = 0;
  private _currentSample: number = 0;
  private _instrumentChannelStates: InstrumentChannelStates[];

  constructor(sampleRate: number, private _numChannels: number) {
    this._channelStates = [];
    this._instrumentChannelStates = [];
    
    this.panic();

    this._sampleRate = sampleRate;
  }

  public panic() {
    for(let channelIdx=0; channelIdx<this._numChannels; channelIdx++) {
      this._channelStates[channelIdx] = new ChannelState(this);
      this._instrumentChannelStates = [];
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
    
    this._changeChanelInstrument(channelState, instrument);
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


  private _changeChanelInstrument(channelState: ChannelState, newInstrument: ScriptSynthInstrument | null) {
    const instrumentChannelStates = this._instrumentChannelStates;
    let oldChannelInstrumentToDelete = channelState.ownerInstrumentState;
    
    // If we don't switch to a new instrument -- nothing to do here
    if(oldChannelInstrumentToDelete?.instrument == newInstrument) {
      return;
    }

    // Remove from current instrument; delete entire instrument if needed
    if(oldChannelInstrumentToDelete) {
      const oldChannelArray = oldChannelInstrumentToDelete.channelStates;
      if(oldChannelArray.length > 1) {
        oldChannelArray.splice(oldChannelArray.indexOf(channelState), 1);        
      } else {
        const instrumentStateIndex = instrumentChannelStates.indexOf(oldChannelInstrumentToDelete);
        instrumentChannelStates.splice(instrumentStateIndex, 1);
      }
    }

    // Try to update existing instrument
    const numInstrumentStates = instrumentChannelStates.length;
    for(let srcIdx=0; srcIdx < numInstrumentStates; srcIdx++) {
      const instrumentState = instrumentChannelStates[srcIdx];

      if(instrumentState.instrument == newInstrument) {
        // Indicate no need to add a new instrument
        newInstrument = null;
        instrumentState.channelStates.push(channelState);
        channelState.ownerInstrumentState = instrumentState;
        break;
      }
    }

    // Add new instrument if needed
    if(newInstrument) {
      const newInstrumentState: InstrumentChannelStates = {
        channelStates: [channelState],
        filterState: newInstrument.createFilterState(this._sampleRate),
        instrument: newInstrument
      }

      instrumentChannelStates.push(newInstrumentState);
      channelState.ownerInstrumentState = newInstrumentState;
    }    
  }


  public readBuffer(destinationLeft: Float32Array, destinationRight: Float32Array, destOffset: number, destLength: number): void
  {
    let currentSample = this._currentSample;
    for(let sampleIndex=destOffset; sampleIndex<destOffset+destLength; sampleIndex++)
    {
      let leftSample = 0;
      let rightSample = 0;

      const currentTime = this._currentTime;

      const instruments = this._instrumentChannelStates.length;
      for(let instrumentIndex=0; instrumentIndex<instruments; instrumentIndex++) {
        const instrumentState = this._instrumentChannelStates[instrumentIndex];
        const channelsCount = instrumentState.channelStates.length;
        const channels = instrumentState.channelStates;

        const instrumentLeftAndRightSample = [0, 0];

        for(let channelIndex=0; channelIndex<channelsCount; channelIndex++) {
          const channelState = channels[channelIndex];
          if(channelState.noteSampleGenerator) {
            if(!channelState.noteSampleGenerator.getNoteSample(currentSample, currentTime, instrumentLeftAndRightSample)) {
              channelState.noteSampleGenerator = null;
              channelState.playingNoteId = null;
            }
          }
        } 

        if(instrumentState.filterState) {
          instrumentState.filterState.filter(instrumentLeftAndRightSample);
        }
        
        leftSample += instrumentLeftAndRightSample[0];
        rightSample += instrumentLeftAndRightSample[1];
      }

      destinationLeft[sampleIndex] = leftSample;
      destinationRight[sampleIndex] = rightSample;

      currentSample++;      
    }

    this._currentSample = currentSample;
    this._currentTime = this._currentSample / this._sampleRate;
  }

  get outputSampleRate(): number {
    return this._sampleRate;
  }
}
