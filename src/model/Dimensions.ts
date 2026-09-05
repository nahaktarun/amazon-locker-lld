/** Value object: centimetres, immutable, compared by value. Knows the one thing everyone gets wrong: rotation. */
export class Dimensions {
  constructor(readonly length: number, readonly width: number, readonly height: number) {
    if ([length, width, height].some(d => !(d > 0))) throw new Error('Dimensions must be positive');
  }
  get volume(): number { return this.length * this.width * this.height; }
  private sorted(): [number, number, number] {
    return [this.length, this.width, this.height].sort((a, b) => b - a) as [number, number, number];
  }
  /** R4: fits fully inside, in any orientation. */
  fitsIn(container: Dimensions): boolean {
    const a = this.sorted(), b = container.sorted();
    return a[0] <= b[0] && a[1] <= b[1] && a[2] <= b[2];
  }
  toString(): string { return `${this.length}x${this.width}x${this.height} cm`; }
}
