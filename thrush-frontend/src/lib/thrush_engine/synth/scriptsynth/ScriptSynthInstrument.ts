import { WaveFormGenerator } from "../common/WaveFormGenerators";


export interface IScriptSynthInstrumentNoteGenerator {
  getNoteSample(currentSample: number, currentTime: number, outChannels: number[]): boolean;

  setVolume(volume: any): void;
  setPanning(panning: number): void;
  setPitchBend(pitchBend: number): void;
  setVibratorGenerator(vibratoGenerator: WaveFormGenerator | null): void;

  releaseNote(releaseSampleNumber: number): void;
}

export abstract class ScriptSynthInstrument {
  abstract createNoteGenerator(note: number, outputSampleRate: number, startSampleNumber: number) : IScriptSynthInstrumentNoteGenerator;
}

