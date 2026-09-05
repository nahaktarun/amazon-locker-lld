import { LOCKER_INTERIOR, LOCKER_SIZES_ASCENDING } from '../enums/LockerSize.js';
import { Dimensions } from '../model/Dimensions.js';
import { Locker } from '../model/Locker.js';

/** Strategy: given the available lockers, which should we try first for this package? Returns a ranked list, not one locker. */
export interface LockerAssignmentStrategy {
  rank(available: Locker[], packageDims: Dimensions): Locker[];
}

const fits = (l: Locker, d: Dimensions) => d.fitsIn(LOCKER_INTERIOR[l.size]);

/** R4: smallest locker the package fits. Keeps the big doors for big boxes. */
export class SmallestFitStrategy implements LockerAssignmentStrategy {
  rank(available: Locker[], dims: Dimensions): Locker[] {
    return available.filter(l => fits(l, dims))
      .sort((a, b) => LOCKER_SIZES_ASCENDING.indexOf(a.size) - LOCKER_SIZES_ASCENDING.indexOf(b.size) || a.id.localeCompare(b.id));
  }
}

/** Alternative: any locker that fits, in door order. Faster to fill, worse for capacity. */
export class FirstFitStrategy implements LockerAssignmentStrategy {
  rank(available: Locker[], dims: Dimensions): Locker[] {
    return available.filter(l => fits(l, dims)).sort((a, b) => a.id.localeCompare(b.id));
  }
}
