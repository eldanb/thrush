export type WaveFormGenerator = (t: number) => number;

export type WaveFormGeneratorFactory = (startTime: number, amplitude: number, frequency: number) => WaveFormGenerator;

export type WaveFormType = "sine";

export const WaveFormGeneratorFactories: { [name in WaveFormType]: WaveFormGeneratorFactory } = {
  sine: (startT, a, f) => {
    return (t) => a * Math.sin((t - startT) * f * Math.PI * 2);
  }
};

