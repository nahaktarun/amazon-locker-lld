import { LockerSize } from '../enums/LockerSize.js';
import { LockerState } from '../enums/LockerState.js';
import { Locker } from '../model/Locker.js';
import { LockerLocation } from '../model/LockerLocation.js';

/**
 * R9: the repository owns locker state changes because they must be atomic in the store.
 * book() is a compare-and-set: it succeeds only if the locker is still AVAILABLE at the version we read.
 */
export interface LockerRepository {
  findAvailable(locationId: string): Promise<Locker[]>;
  book(lockerId: string, expectedVersion: number, assignedTo: string): Promise<boolean>;
  occupy(lockerId: string): Promise<void>;
  release(lockerId: string): Promise<void>;
  get(lockerId: string): Promise<Locker>;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class InMemoryLockerRepository implements LockerRepository {
  private readonly lockers = new Map<string, Locker>();
  /** latencyMs simulates a database round trip so `await` gaps behave like production. */
  constructor(locations: LockerLocation[], private readonly latencyMs = 2) {
    for (const loc of locations) for (const l of loc.lockers) this.lockers.set(l.id, { ...l });
  }

  async findAvailable(locationId: string): Promise<Locker[]> {
    await sleep(this.latencyMs);
    return [...this.lockers.values()].filter(l => l.locationId === locationId && l.state === LockerState.AVAILABLE).map(l => ({ ...l }));
  }

  async book(lockerId: string, expectedVersion: number, assignedTo: string): Promise<boolean> {
    await sleep(this.latencyMs);
    // Nothing awaits between the check and the write: atomic in one process.
    // SQL:   UPDATE lockers SET state='BOOKED', assigned_to=?, version=version+1 WHERE id=? AND state='AVAILABLE' AND version=?
    // Mongo: findOneAndUpdate({ _id, state:'AVAILABLE', version }, { $set:{ state:'BOOKED', assignedTo }, $inc:{ version:1 } })
    const l = this.lockers.get(lockerId);
    if (!l || l.state !== LockerState.AVAILABLE || l.version !== expectedVersion) return false;
    l.state = LockerState.BOOKED; l.assignedTo = assignedTo; l.version++;
    return true;
  }

  async occupy(lockerId: string): Promise<void> { await sleep(this.latencyMs); const l = this.must(lockerId); l.state = LockerState.OCCUPIED; l.version++; }
  async release(lockerId: string): Promise<void> { await sleep(this.latencyMs); const l = this.must(lockerId); l.state = LockerState.AVAILABLE; l.assignedTo = null; l.version++; }
  async get(lockerId: string): Promise<Locker> { await sleep(this.latencyMs); return { ...this.must(lockerId) }; }

  /** The naive write (read, await, overwrite). Only the race demo uses it. */
  async unsafeSave(locker: Locker): Promise<void> { await sleep(this.latencyMs); this.lockers.set(locker.id, { ...locker }); }
  private must(id: string): Locker { const l = this.lockers.get(id); if (!l) throw new Error(`Locker ${id} not found`); return l; }
  sizeOf(id: string): LockerSize { return this.must(id).size; }
}
