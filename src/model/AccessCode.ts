import { randomInt, timingSafeEqual } from 'node:crypto';

export interface CodeGenerator { next(): string; }

/** R5: a 6-digit PIN. From a CSPRNG and zero-padded; `Math.random()*1e6` is five digits one time in ten. */
export class SixDigitCodeGenerator implements CodeGenerator {
  next(): string { return String(randomInt(0, 1_000_000)).padStart(6, '0'); }
}
/** Tests inject predictable codes. */
export class FixedCodeGenerator implements CodeGenerator {
  private i = 0;
  constructor(private readonly codes: string[]) {}
  next(): string { return this.codes[this.i++ % this.codes.length]!; }
}

/** Value object. R10: single use is enforced by whoever holds it (the package clears it after use). */
export class AccessCode {
  constructor(readonly value: string, readonly validTill: Date) {
    if (!/^\d{6}$/.test(value)) throw new Error(`Access code must be 6 digits, got "${value}"`);
  }
  matches(input: string): boolean {
    return input.length === this.value.length && timingSafeEqual(Buffer.from(this.value), Buffer.from(input));   // constant time
  }
  isValidAt(when: Date): boolean { return when < this.validTill; }
  toString(): string { return this.value; }
}
