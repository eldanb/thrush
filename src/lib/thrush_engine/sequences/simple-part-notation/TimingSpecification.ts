
export abstract class TimingSpecification {
  public abstract delay(tempo: number): number;
}

export class TempoRelativeTimingSpecification extends TimingSpecification {
  constructor(public denom: number, public andHalf: boolean) {
    super();
  }

  public delay(tempo: number): number {
    return (tempo / this.denom) * (this.andHalf ? 1.5 : 1);
  }

  public static wholeNote: TempoRelativeTimingSpecification = new TempoRelativeTimingSpecification(1, false);
}

export class TempoAbsoluteTimingSpecification extends TimingSpecification {
  constructor(public ms: number) {
    super();
  }

  public delay(tempo: number): number {
    return this.ms / 1000;
  }
}