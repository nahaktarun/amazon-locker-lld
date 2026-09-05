/**
 * R9: a locker is assigned to one package at a time.
 * AVAILABLE → BOOKED (assigned, package on its way) → OCCUPIED (package inside) → AVAILABLE.
 * OUT_OF_SERVICE is set by maintenance and is never assigned.
 */
export enum LockerState {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  OCCUPIED = 'OCCUPIED',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}
