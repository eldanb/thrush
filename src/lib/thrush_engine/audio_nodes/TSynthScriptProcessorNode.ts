import { SequencingToneGenerator } from "../ToneGenerator";

export class TSynthScriptProcessorNode {
  private _sequencingEngine: SequencingToneGenerator;
  private _audioContext: AudioContext;
  private _audioSource: ScriptProcessorNode;

  constructor(audioContext: AudioContext, numChannels: number) {
    this._sequencingEngine = new SequencingToneGenerator(audioContext.sampleRate, numChannels);

    this._audioContext = audioContext;

    this._audioSource = audioContext.createScriptProcessor(1024, 0, 2);
    this._audioSource.onaudioprocess = (e) => this.onAudioProcess(e);
  }

  get audioNode(): AudioNode {
    return this._audioSource;
  }

  private onAudioProcess(pumpAudioEvent: AudioProcessingEvent) {
    this._sequencingEngine.fillSampleBuffer(
      this._audioContext.currentTime,
      pumpAudioEvent.outputBuffer.getChannelData(0),
      pumpAudioEvent.outputBuffer.getChannelData(1),
      0,
      pumpAudioEvent.outputBuffer.length);
  }
}
