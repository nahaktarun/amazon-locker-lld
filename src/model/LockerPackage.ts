import { AccessCode } from './AccessCode.js';
import { Package } from './Package.js';

export enum LockerPackageStatus { BOOKED = 'BOOKED', DELIVERED = 'DELIVERED', PICKED_UP = 'PICKED_UP', EXPIRED = 'EXPIRED', REMOVED = 'REMOVED' }

export class InvalidTransitionError extends Error {
  constructor(from: string, action: string) { super(`Cannot ${action} a package that is ${from}`); this.name = 'InvalidTransitionError'; }
}
export class InvalidCodeError extends Error {
  constructor() { super('Invalid or expired access code'); this.name = 'InvalidCodeError'; }
}

/** State pattern: each status is a class that knows which actions are legal from it. */
export interface LockerPackageState {
  readonly status: LockerPackageStatus;
  deliver(p: LockerPackage, now: Date): LockerPackageState;
  pickUp(p: LockerPackage, code: string, now: Date): LockerPackageState;
  expire(p: LockerPackage, now: Date): LockerPackageState;
  remove(p: LockerPackage): LockerPackageState;
}

abstract class Base implements LockerPackageState {
  abstract readonly status: LockerPackageStatus;
  deliver(_p: LockerPackage, _now: Date): LockerPackageState { throw new InvalidTransitionError(this.status, 'deliver'); }
  pickUp(_p: LockerPackage, _c: string, _now: Date): LockerPackageState { throw new InvalidTransitionError(this.status, 'pick up'); }
  expire(_p: LockerPackage, _now: Date): LockerPackageState { throw new InvalidTransitionError(this.status, 'expire'); }
  remove(_p: LockerPackage): LockerPackageState { throw new InvalidTransitionError(this.status, 'remove'); }
}
class Booked extends Base {
  readonly status = LockerPackageStatus.BOOKED;
  override deliver(p: LockerPackage, now: Date): LockerPackageState { p._issueCode(now); return new Delivered(); }
  override remove(): LockerPackageState { return new Removed(); }          // never delivered; free the locker
}
class Delivered extends Base {
  readonly status = LockerPackageStatus.DELIVERED;
  override pickUp(p: LockerPackage, code: string, now: Date): LockerPackageState {
    const c = p.code;
    if (!c || !c.isValidAt(now) || !c.matches(code)) throw new InvalidCodeError();
    p._clearCode(now);                                                    // R10: cannot be reused
    return new PickedUp();
  }
  override expire(p: LockerPackage, now: Date): LockerPackageState {
    if (p.code?.isValidAt(now)) throw new InvalidTransitionError('still within its pickup window', 'expire');
    p._clearCode(null);
    return new Expired();
  }
}
class Expired extends Base { readonly status = LockerPackageStatus.EXPIRED; override remove(): LockerPackageState { return new Removed(); } }
class PickedUp extends Base { readonly status = LockerPackageStatus.PICKED_UP; }
class Removed extends Base { readonly status = LockerPackageStatus.REMOVED; }

/**
 * A package assigned to a locker: the aggregate for the delivery flow (R5, R6, R8, R10).
 * #private fields; the only way to change status is through the state machine.
 */
export class LockerPackage {
  #state: LockerPackageState = new Booked();
  #code: AccessCode | null = null;
  #deliveredAt: Date | null = null;
  #pickedUpAt: Date | null = null;

  constructor(
    readonly id: string,
    readonly pkg: Package,
    readonly lockerId: string,
    readonly locationId: string,
    readonly customerId: string,
    private readonly newCode: (now: Date) => AccessCode,
  ) {}

  get status(): LockerPackageStatus { return this.#state.status; }
  get code(): AccessCode | null { return this.#code; }
  get deliveredAt(): Date | null { return this.#deliveredAt; }
  get pickedUpAt(): Date | null { return this.#pickedUpAt; }

  deliver(now: Date): void { this.#state = this.#state.deliver(this, now); }
  pickUp(code: string, now: Date): void { this.#state = this.#state.pickUp(this, code, now); }
  expire(now: Date): void { this.#state = this.#state.expire(this, now); }
  remove(): void { this.#state = this.#state.remove(this); }

  _issueCode(now: Date): void { this.#deliveredAt = now; this.#code = this.newCode(now); }
  _clearCode(pickedUpAt: Date | null): void { this.#code = null; if (pickedUpAt) this.#pickedUpAt = pickedUpAt; }
}
