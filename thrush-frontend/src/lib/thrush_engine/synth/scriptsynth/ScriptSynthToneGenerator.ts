import { WaveFormGenerator, WaveFormGeneratorFactories, WaveFormType } from "../common/WaveFormGenerators";
import { EnvelopeCurveCoordinate, Envelopes, ScriptSynthGeneratedToneParameters, ScriptSynthInstrument } from "./ScriptSynthInstrument";


class EnvelopeCurveState {
  constructor(
    private _envelope: EnvelopeCurveCoordinate[], 
    private _startValue: number,    
    private _epochSample: number, 
    private _sampleRate: number,
    ) {
    this._endValue = _envelope[0].value;
    this.currentValue = -1;
    this._delta = this._endValue - this._startValue;
    
    this._startSample = _epochSample;
    this._endSample = _epochSample + _envelope[0].time * _sampleRate;
    this._durationSamples = this._endSample - this._startSample;
  }


  updateEnvelopeState(currentSample: number) {
    // Page to next curve segment?
    if(this.running && this._endSample <= currentSample) {
      let running = true;
      let currentEnvelopeCurveIndex = this._curveIndex;
      let currentEndSample = this._endSample;
      let currentEndValue = this._endValue;
  
      while(currentEndSample <= currentSample) {
        if(currentEnvelopeCurveIndex >= this._envelope.length-1) {
          running = false;
          break;
        }
  
        currentEnvelopeCurveIndex++;
  
        const currentCurve = this._envelope[currentEnvelopeCurveIndex];
        currentEndSample = currentCurve.time * this._sampleRate + this._epochSample;
        currentEndValue = currentCurve.value;
      }
  
      if(running) {
        const previousCurve = this._envelope[currentEnvelopeCurveIndex-1];
  
        this._startValue = previousCurve.value;
        this._startSample = previousCurve.time * this._sampleRate 
          + this._epochSample;
  
        this._endValue = this._envelope[currentEnvelopeCurveIndex].value;
        this._endSample = currentEndSample;
  
        this._delta = this._endValue - this._startValue;
        this._durationSamples = this._endSample - this._startSample;
  
        this._curveIndex = currentEnvelopeCurveIndex;
      } else {
        this.currentValue = currentEndValue;
        this.running = false;
      }
    }
  
    if(this.running) {
      this.currentValue = this._startValue + 
      this._delta * 
        (currentSample - this._startSample)/this._durationSamples;
    }
  }

  public running: boolean = true;
  public currentValue: number = 0;
  
  private _curveIndex: number = 0;  
  private _endValue: number;
  private _delta: number;

  private _startSample: number;
  private _endSample: number; 
  private _durationSamples: number;
};

type EnvelopeState = {
  [envelope in keyof Envelopes]: EnvelopeCurveState;
}



class ChannelState implements ScriptSynthGeneratedToneParameters {
  toneGenerator: ScriptSynthToneGenerator;

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

    instrument.configureToneGenerationParams(this, note);

    this.effectivePitch = (this.sampleRate / this.toneGenerator.outputSampleRate) * this.samplePitch;
    this.sampleCursor = this.sampleStartOffset;
    
    this.startEnvelope(this.enterEnvelopes, false, startSampleNumber);    
  }

  releaseNote(releaseSampleNumber: number) {
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

  public playNoteOnChannel(channel: number, instrument: ScriptSynthInstrument, note: number) {
    const channelState = this._channelStates[channel];
    channelState.playNote(instrument, note, this._currentSample);
  }

  public setVolumeOnChannel(channel: number, volume: number) {
    const channelState = this._channelStates[channel];
    channelState.volume = volume;
  }

  public setPanningOnChannel(channel: number, panning: number) {
    const channelState = this._channelStates[channel];
    channelState.panning = panning;
  }

  public setVibratoOnChannel(channel: number, waveform: "none" | WaveFormType, frequency: number, amplitude: number) {
    const channelState = this._channelStates[channel];
    channelState.vibratoGenerator = 
      waveform === "none"
        ? null
        : WaveFormGeneratorFactories[waveform](this._currentTime, amplitude, frequency);
    
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

          if(sampleIndex < channelState.sample.length-1) {
            // Update envelopes
            const envelopeState = channelState.envelopeState;
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
