import { LockerSize } from '../enums/LockerSize.js';
import { LockerState } from '../enums/LockerState.js';
import { Locker } from './Locker.js';
import { OperatingHours } from './OperatingHours.js';

/** R3, R7: a place with many lockers and opening hours. Built through a Builder so an invalid location cannot exist. */
export class LockerLocation {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly address: string,
    readonly hours: OperatingHours,
    readonly lockers: readonly Locker[],
  ) {}

  static builder(id: string): LockerLocationBuilder { return new LockerLocationBuilder(id); }
  static _fromBuilder(b: LockerLocationBuilder): LockerLocation { return new LockerLocation(b.id, b.name!, b.address!, b.hours, b.lockers); }

  isOpenAt(when: Date): boolean { return this.hours.isOpenAt(when); }
  countBySize(): Record<string, number> {
    return this.lockers.reduce<Record<string, number>>((acc, l) => { acc[l.size] = (acc[l.size] ?? 0) + 1; return acc; }, {});
  }
}

export class LockerLocationBuilder {
  name: string | null = null;
  address: string | null = null;
  hours: OperatingHours = OperatingHours.always();
  lockers: Locker[] = [];
  constructor(readonly id: string) {}

  named(name: string): this { this.name = name; return this; }
  at(address: string): this { this.address = address; return this; }
  openDaily(open: string, close: string): this { this.hours = OperatingHours.daily(open, close); return this; }
  withLockers(size: LockerSize, count: number): this {
    for (let i = 1; i <= count; i++) {
      this.lockers.push({ id: `${this.id}-${size}-${i}`, locationId: this.id, size, state: LockerState.AVAILABLE, assignedTo: null, version: 0 });
    }
    return this;
  }
  build(): LockerLocation {
    if (!this.name) throw new Error('Location needs a name');
    if (!this.address) throw new Error('Location needs an address');
    if (this.lockers.length === 0) throw new Error('Location needs at least one locker');
    return LockerLocation._fromBuilder(this);
  }
}
