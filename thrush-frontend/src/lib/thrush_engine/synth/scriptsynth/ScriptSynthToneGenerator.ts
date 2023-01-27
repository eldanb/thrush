import { EnvelopeCurveState } from "../common/Envelopes";
import { WaveFormGenerator, WaveFormGeneratorFactories, WaveFormType } from "../common/WaveFormGenerators";
import { Envelopes, ScriptSynthGeneratedToneParameters, ScriptSynthInstrument } from "./ScriptSynthInstrument";



type EnvelopeState = {
  [envelope in keyof Envelopes]: EnvelopeCurveState;
}


class ChannelState implements ScriptSynthGeneratedToneParameters {
  toneGenerator: ScriptSynthToneGenerator;

  playingNoteId: string | null = null;

  sample: Float32Array | null = null;
  
  sampleStartOffset: number = 0;
  sampleLoopStart: number = 0;
  sampleLoopLen: number = 0;
  samplePitch: number = 1;
  sampleRate: number = 0;

  volume: number = 0;
  panning: number = 0.5;

  vibratoGenerator: WaveFormGenerator | null = null;

  sampleCursor: number = 0;
  effectivePitch: number = 1;
  inLoop: boolean = false;

  enterEnvelopes: Envelopes | null = null;
  exitEnvelopes: Envelopes | null = null;

  envelopeState: EnvelopeState | null = null;
  envelopeStateEpochSample: number = 0;
  releasing: boolean = false;

  constructor(toneGenerator: ScriptSynthToneGenerator) {
    this.toneGenerator = toneGenerator;
  }

  private startEnvelope(envelopes: Envelopes | null, startFromCurrent: boolean, epochSampleNumber: number) {
    this.envelopeState = envelopes && {
      volume: envelopes.volume && 
        new EnvelopeCurveState(envelopes.volume, 
          startFromCurrent ? this.envelopeState!.volume.currentValue : 0, 
          epochSampleNumber, this.toneGenerator.outputSampleRate)      
    }

    this.envelopeStateEpochSample = epochSampleNumber;
  }

  playNote(instrument: ScriptSynthInstrument, note: number, startSampleNumber: number) {
    this.inLoop = false;
    this.releasing = false;

    instrument.configureToneGenerationParams(this, note);

    this.effectivePitch = (this.sampleRate / this.toneGenerator.outputSampleRate) * this.samplePitch;
    this.sampleCursor = this.sampleStartOffset;
    
    this.startEnvelope(this.enterEnvelopes, false, startSampleNumber);    
  }

  releaseNote(releaseSampleNumber: number) {
    this.releasing = true;
    this.playingNoteId = null;
    this.startEnvelope(this.exitEnvelopes, true, releaseSampleNumber);
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
      channelState = this._channelStates.find(channelState => !channelState.sample);
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
    channelState.volume = volume;
  }

  public setPanningOnChannel(channelOrNoteId: number | string, panning: number) {
    const channelState = this._getChannelState(channelOrNoteId);
    channelState.panning = panning;
  }

  public setVibratoOnChannel(channelOrNoteId: number | string, waveform: "none" | WaveFormType, frequency: number, amplitude: number) {
    const channelState = this._getChannelState(channelOrNoteId);
    channelState.vibratoGenerator = 
      waveform === "none"
        ? null
        : WaveFormGeneratorFactories[waveform](this._currentTime, amplitude, frequency);
    
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
    for(let i=destOffset; i<destOffset+destLength; i++)
    {
      let leftSample = 0;
      let rightSample = 0;

      this._channelStates.forEach((channelState, channelIndex) => {
        if(channelState.sample) {
          let sampleIndex = channelState.sampleCursor;

          // Update envelopes
          const envelopeState = channelState.envelopeState;

          if(channelState.releasing && !envelopeState?.volume?.running) {
            sampleIndex = channelState.sample.length;
          }

          if(sampleIndex < channelState.sample.length-1) {
            if(envelopeState?.volume?.running) {
              envelopeState.volume.updateEnvelopeState(currentSample);
            }
            
            // Compute current effective volume, pitch, panning
            const sampleEffectiveVolume = channelState.volume
              * (channelState.envelopeState?.volume?.currentValue ?? 1);
              
            const sampleEffectivePitch = channelState.effectivePitch 
              * (1 + (channelState.vibratoGenerator ? channelState.vibratoGenerator(this._currentTime) : 0));

            const sampleEffectivePanning = channelState.panning ;

            // Emit sample based on volume, pitch, panning
            const sampleIndexFloor = Math.floor(sampleIndex);
            const baseSample =
              (channelState.sample[sampleIndexFloor] +
                (sampleIndex-sampleIndexFloor) * (channelState.sample[sampleIndexFloor+1]-channelState.sample[sampleIndexFloor])) *
                sampleEffectiveVolume;
            
            leftSample += baseSample * (1-sampleEffectivePanning);
            rightSample += baseSample * sampleEffectivePanning;
            
            // Advance sample index and loop
            sampleIndex += sampleEffectivePitch;

            if(!channelState.inLoop && sampleIndex >= channelState.sample.length-1 && channelState.sampleLoopLen) {
              console.log("Start loop channel " + channelIndex);
              sampleIndex = channelState.sampleLoopStart - (sampleIndex - channelState.sample.length);
              channelState.inLoop = true;
            }

            while(channelState.inLoop && sampleIndex >= channelState.sampleLoopLen + channelState.sampleLoopStart - 1) {
              console.log("loop channel " + channelIndex);
              sampleIndex -= channelState.sampleLoopLen;
            }
            
            channelState.sampleCursor = sampleIndex;
          } else {
            channelState.sample = null;
            channelState.playingNoteId = null;
            console.log("End sample channel " + channelIndex);
          }
        }
      });

      destinationLeft[i] = leftSample;
      destinationRight[i] = rightSample;
      currentSample++;      
    }

    this._currentSample = currentSample;
    this._currentTime = this._currentSample / this._sampleRate;
  }

  get outputSampleRate(): number {
    return this._sampleRate;
  }
}
