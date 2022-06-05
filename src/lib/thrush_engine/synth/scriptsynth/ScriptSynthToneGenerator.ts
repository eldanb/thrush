import { ScriptSynthGeneratedToneParameters, ScriptSynthInstrument } from "./ScriptSynthInstrument";


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

  sampleCursor: number = 0;
  effectivePitch: number = 1;
  inLoop: boolean = false;

  constructor(toneGenerator: ScriptSynthToneGenerator) {
    this.toneGenerator = toneGenerator;
  }

  playNote(instrument: ScriptSynthInstrument, note: number) {
    this.inLoop = false;

    instrument.configureToneGenerationParams(this, note);

    this.effectivePitch = (this.sampleRate / this.toneGenerator.outputSampleRate) * this.samplePitch;
    this.sampleCursor = this.sampleStartOffset;
  }


}

export class ScriptSynthToneGenerator {
  private _sampleRate: number;
  private _channelStates: ChannelState[];

  constructor(sampleRate: number, numChannels: number) {
    this._channelStates = [];
    for(let channelIdx=0; channelIdx<numChannels; channelIdx++) {
      this._channelStates[channelIdx] = new ChannelState(this);
    }

    this._sampleRate = sampleRate;
  }

  public playNoteOnChannel(channel: number, instrument: ScriptSynthInstrument, note: number) {
    const channelState = this._channelStates[channel];
    channelState.playNote(instrument, note);
  }

  public setVolumeOnChannel(channel: number, volume: number) {
    const channelState = this._channelStates[channel];
    channelState.volume = volume;
  }

  public setPanningOnChannel(channel: number, panning: number) {
    const channelState = this._channelStates[channel];
    channelState.panning = panning;
  }

  public readBuffer(destinationLeft: Float32Array, destinationRight: Float32Array, destOffset: number, destLength: number): void
  {
    for(let i=destOffset; i<destOffset+destLength; i++)
    {
      let leftSample = 0;
      let rightSample = 0;

      this._channelStates.forEach((channelState, channelIndex) => {
        if(channelState.sample) {

          let sampleIndex = channelState.sampleCursor;

          if(sampleIndex < channelState.sample.length-1) {
            const sampleIndexFloor = Math.floor(sampleIndex);

            const baseSample =
              (channelState.sample[sampleIndexFloor] +
                (sampleIndex-sampleIndexFloor) * (channelState.sample[sampleIndexFloor+1]-channelState.sample[sampleIndexFloor])) *
                channelState.volume;

            leftSample += baseSample * (1-channelState.panning);
            rightSample += baseSample * channelState.panning;


            sampleIndex += channelState.effectivePitch;

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
          }
        }
      });

      destinationLeft[i] = leftSample;
      destinationRight[i] = rightSample;
    }
  }

  get outputSampleRate(): number {
    return this._sampleRate;
  }
}
