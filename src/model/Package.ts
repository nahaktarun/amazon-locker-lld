import { Dimensions } from './Dimensions.js';
import { Item } from './Item.js';

/** R2: one or more items boxed together. The box, not the items, is what has to fit a locker. */
export class Package {
  constructor(readonly id: string, readonly orderId: string, readonly items: readonly Item[], readonly dimensions: Dimensions) {
    if (items.length === 0) throw new Error('A package needs at least one item');
  }
  get valueCents(): number { return this.items.reduce((s, i) => s + i.priceCents, 0); }
}
