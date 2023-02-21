import { WaveFormGenerator } from "../common/WaveFormGenerators";


export interface IScriptSynthInstrumentNoteGenerator {
  getNoteSample(currentSample: number, currentTime: number, outChannels: number[]): boolean;

  setVolume(volume: any): unknown;
  setPanning(panning: number): unknown;
  setVibratorGenerator(vibratoGenerator: WaveFormGenerator | null): unknown;

  releaseNote(releaseSampleNumber: number): void;
}

export abstract class ScriptSynthInstrument {
  abstract createNoteGenerator(note: number, outputSampleRate: number, startSampleNumber: number) : IScriptSynthInstrumentNoteGenerator;
}

