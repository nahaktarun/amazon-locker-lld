import { Customer } from './Customer.js';
import { Item } from './Item.js';

export enum OrderStatus { PLACED = 'PLACED', PACKED = 'PACKED', DELIVERED = 'DELIVERED', COMPLETED = 'COMPLETED', REFUNDED = 'REFUNDED' }

/** R1: the customer picks a locker location at checkout, so the order carries it. */
export class Order {
  #status = OrderStatus.PLACED;
  constructor(
    readonly id: string,
    readonly customer: Customer,
    readonly items: readonly Item[],
    readonly lockerLocationId: string,
  ) {
    if (items.length === 0) throw new Error('An order needs at least one item');
  }
  get status(): OrderStatus { return this.#status; }
  get totalCents(): number { return this.items.reduce((s, i) => s + i.priceCents, 0); }
  markPacked() { this.#status = OrderStatus.PACKED; }
  markDelivered() { this.#status = OrderStatus.DELIVERED; }
  markCompleted() { this.#status = OrderStatus.COMPLETED; }
  markRefunded() { this.#status = OrderStatus.REFUNDED; }
}
