import { LockerSize } from '../enums/LockerSize.js';
import { LockerState } from '../enums/LockerState.js';

/**
 * R3, R9: one physical door. Modelled as a row with a version, not a rich object,
 * because its state changes must be atomic in storage (two customers, one locker).
 * The LockerRepository owns every write to it.
 */
export interface Locker {
  readonly id: string;
  readonly locationId: string;
  readonly size: LockerSize;
  state: LockerState;
  /** id of the LockerPackage or ReturnPackage currently assigned, if any */
  assignedTo: string | null;
  version: number;
}
