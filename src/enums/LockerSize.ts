import { Dimensions } from '../model/Dimensions.js';

/** R3: six locker sizes. Ordered smallest to largest so "smallest that fits" is a scan. */
export enum LockerSize {
  EXTRA_SMALL = 'XS',
  SMALL = 'S',
  MEDIUM = 'M',
  LARGE = 'L',
  EXTRA_LARGE = 'XL',
  DOUBLE_EXTRA_LARGE = 'XXL',
}

export const LOCKER_SIZES_ASCENDING: readonly LockerSize[] = [
  LockerSize.EXTRA_SMALL, LockerSize.SMALL, LockerSize.MEDIUM,
  LockerSize.LARGE, LockerSize.EXTRA_LARGE, LockerSize.DOUBLE_EXTRA_LARGE,
];

/** R4: interior dimensions (cm). A package is eligible only if it fits fully inside. */
export const LOCKER_INTERIOR: Record<LockerSize, Dimensions> = {
  [LockerSize.EXTRA_SMALL]: new Dimensions(30, 20, 10),
  [LockerSize.SMALL]: new Dimensions(40, 30, 15),
  [LockerSize.MEDIUM]: new Dimensions(45, 35, 25),
  [LockerSize.LARGE]: new Dimensions(60, 40, 35),
  [LockerSize.EXTRA_LARGE]: new Dimensions(70, 50, 45),
  [LockerSize.DOUBLE_EXTRA_LARGE]: new Dimensions(90, 60, 60),
};
