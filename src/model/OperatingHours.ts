/** R7: each location opens and closes. Minutes since midnight; 24/7 is [0, 1440). */
export class OperatingHours {
  private constructor(private readonly openMin: number, private readonly closeMin: number) {}
  static always(): OperatingHours { return new OperatingHours(0, 24 * 60); }
  static daily(open: string, close: string): OperatingHours {
    const m = (s: string) => { const [h, mi] = s.split(':').map(Number); return (h ?? 0) * 60 + (mi ?? 0); };
    if (m(open) >= m(close)) throw new Error(`Opening ${open} must be before closing ${close}`);
    return new OperatingHours(m(open), m(close));
  }
  isOpenAt(when: Date): boolean {
    const minute = when.getHours() * 60 + when.getMinutes();
    return minute >= this.openMin && minute < this.closeMin;
  }
  toString(): string {
    const f = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return this.openMin === 0 && this.closeMin === 1440 ? '24 hours' : `${f(this.openMin)}-${f(this.closeMin)}`;
  }
}
