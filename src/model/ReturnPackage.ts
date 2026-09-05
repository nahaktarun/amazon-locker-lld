import { AccessCode } from './AccessCode.js';
import { InvalidCodeError, InvalidTransitionError } from './LockerPackage.js';
import { Item } from './Item.js';

export enum ReturnStatus { REQUESTED = 'REQUESTED', DROPPED = 'DROPPED', COLLECTED = 'COLLECTED', CANCELLED = 'CANCELLED' }

/**
 * R11, R12: the return flow mirrors delivery with the roles swapped. The customer opens the locker
 * with one code to drop the item; logistics opens it with a different code to collect it.
 */
export class ReturnPackage {
  #status = ReturnStatus.REQUESTED;
  #customerCode: AccessCode | null;
  #logisticsCode: AccessCode | null = null;
  #droppedAt: Date | null = null;

  constructor(
    readonly id: string,
    readonly item: Item,
    readonly orderId: string,
    readonly customerId: string,
    readonly lockerId: string,
    readonly locationId: string,
    customerCode: AccessCode,
    private readonly newCode: (now: Date) => AccessCode,
  ) { this.#customerCode = customerCode; }

  get status(): ReturnStatus { return this.#status; }
  get customerCode(): AccessCode | null { return this.#customerCode; }
  get logisticsCode(): AccessCode | null { return this.#logisticsCode; }
  get droppedAt(): Date | null { return this.#droppedAt; }

  /** Customer opens the locker and places the item. Their code dies; a logistics code is born. */
  drop(code: string, now: Date): void {
    if (this.#status !== ReturnStatus.REQUESTED) throw new InvalidTransitionError(this.#status, 'drop');
    if (!this.#customerCode?.isValidAt(now) || !this.#customerCode.matches(code)) throw new InvalidCodeError();
    this.#customerCode = null; this.#droppedAt = now; this.#logisticsCode = this.newCode(now);
    this.#status = ReturnStatus.DROPPED;
  }
  /** Logistics collects. */
  collect(code: string, now: Date): void {
    if (this.#status !== ReturnStatus.DROPPED) throw new InvalidTransitionError(this.#status, 'collect');
    if (!this.#logisticsCode?.isValidAt(now) || !this.#logisticsCode.matches(code)) throw new InvalidCodeError();
    this.#logisticsCode = null;
    this.#status = ReturnStatus.COLLECTED;
  }
  /** Customer never came to drop it within the window. */
  cancel(): void {
    if (this.#status !== ReturnStatus.REQUESTED) throw new InvalidTransitionError(this.#status, 'cancel');
    this.#customerCode = null; this.#status = ReturnStatus.CANCELLED;
  }
}
