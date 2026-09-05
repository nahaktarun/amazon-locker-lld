export interface Clock { now(): Date; }
export class SystemClock implements Clock { now(): Date { return new Date(); } }
/** R6/R7 are about time. Time is a dependency; inject it or you cannot test it. */
export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date { return new Date(this.current); }
  set(d: Date): void { this.current = new Date(d); }
  advanceHours(h: number): void { this.current = new Date(this.current.getTime() + h * 3_600_000); }
}
