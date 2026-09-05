import { Dimensions } from '../model/Dimensions.js';
import { Locker } from '../model/Locker.js';
import { InMemoryLockerRepository, LockerRepository } from '../repository/LockerRepository.js';
import { LockerAssignmentStrategy } from './LockerAssignmentStrategy.js';
import { LockerState } from '../enums/LockerState.js';

export class NoLockerAvailableError extends Error {
  constructor(locationId: string, dims: Dimensions) { super(`No available locker at ${locationId} fits a ${dims} package`); this.name = 'NoLockerAvailableError'; }
}

export interface LockerAssigner { assign(locationId: string, dims: Dimensions, assignTo: string): Promise<Locker>; }

/** R9 done right: rank, then try to book each candidate atomically until one succeeds. The loser moves to the next door. */
export class AtomicLockerAssigner implements LockerAssigner {
  constructor(private readonly lockers: LockerRepository, private readonly strategy: LockerAssignmentStrategy) {}
  async assign(locationId: string, dims: Dimensions, assignTo: string): Promise<Locker> {
    const available = await this.lockers.findAvailable(locationId);
    for (const candidate of this.strategy.rank(available, dims)) {
      if (await this.lockers.book(candidate.id, candidate.version, assignTo)) return this.lockers.get(candidate.id);
    }
    throw new NoLockerAvailableError(locationId, dims);
  }
}

/** R9 done wrong, on purpose: check, await, then write. Two customers get one locker. Used by the race demo only. */
export class NaiveLockerAssigner implements LockerAssigner {
  constructor(private readonly lockers: InMemoryLockerRepository, private readonly strategy: LockerAssignmentStrategy) {}
  async assign(locationId: string, dims: Dimensions, assignTo: string): Promise<Locker> {
    const available = await this.lockers.findAvailable(locationId);
    const locker = this.strategy.rank(available, dims)[0];
    if (!locker) throw new NoLockerAvailableError(locationId, dims);
    // ← the other customer's request runs here and sees the same AVAILABLE locker
    await this.lockers.unsafeSave({ ...locker, state: LockerState.BOOKED, assignedTo: assignTo });
    return locker;
  }
}
