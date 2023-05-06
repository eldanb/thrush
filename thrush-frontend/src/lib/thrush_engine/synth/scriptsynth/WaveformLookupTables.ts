export const STEPS_PER_SINE_CYCLE = 2048;

export const SinLookup: number[] = [];

for(let idx=0; idx < STEPS_PER_SINE_CYCLE; idx++) {
  SinLookup[idx] = Math.sin((idx / STEPS_PER_SINE_CYCLE) * 2 * Math.PI);
}
