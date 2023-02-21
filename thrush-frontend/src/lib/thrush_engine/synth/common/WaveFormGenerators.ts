export type WaveFormGenerator = (t: number) => number;

export type WaveFormGeneratorFactory = (startTime: number, amplitude: number, frequency: number) => WaveFormGenerator;

export type WaveFormType = "sine";

export const WaveFormGeneratorFactories: { [name in WaveFormType]: WaveFormGeneratorFactory } = {
  sine: (startT, a, f) => {
    return (t) => a * SineLookupTable[Math.floor(((t - startT) * f * 512)) & 0x1ff]; //a * Math.sin((t - startT) * f * Math.PI * 2);
  }
};

const SineLookupTable: number[] = [];
for(let i=0; i<512; i++) {
  SineLookupTable[i] = Math.sin((i / 512) * Math.PI * 2);
}