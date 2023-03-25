
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

  public static qNote: TempoRelativeTimingSpecification = new TempoRelativeTimingSpecification(4, false);
}

export class LegatoTimingSpecification extends TimingSpecification {
  constructor(public specifications: TimingSpecification[]) {
    super();
  }

  public delay(tempo: number): number {
    return this.specifications.reduce((currentValue, spec) => currentValue + spec.delay(tempo), 0);
  }
}

export class TempoAbsoluteTimingSpecification extends TimingSpecification {
  constructor(public ms: number) {
    super();
  }

  public delay(tempo: number): number {
    return this.ms / 1000;
  }
}