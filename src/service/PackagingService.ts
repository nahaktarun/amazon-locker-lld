import { LOCKER_INTERIOR, LockerSize } from '../enums/LockerSize.js';
import { Dimensions } from '../model/Dimensions.js';
import { Item } from '../model/Item.js';
import { Order } from '../model/Order.js';
import { Package } from '../model/Package.js';

/**
 * R2: items are packaged together where possible. Boxes are built by stacking items
 * (footprint = max length x max width, height = sum). When the box would no longer fit the
 * largest locker, start a new box. Deliberately simple; the interview point is where this
 * responsibility lives (its own service), not the bin-packing algorithm.
 */
export class PackagingService {
  private readonly limit = LOCKER_INTERIOR[LockerSize.DOUBLE_EXTRA_LARGE];
  private seq = 0;

  pack(order: Order): Package[] {
    for (const item of order.items) {
      if (!item.dimensions.fitsIn(this.limit)) throw new Error(`${item.name} (${item.dimensions}) cannot fit any locker`);   // R4
    }
    const sorted = [...order.items].sort((a, b) => b.dimensions.volume - a.dimensions.volume);
    const boxes: Item[][] = [];
    let current: Item[] = [];
    for (const item of sorted) {
      const candidate = [...current, item];
      if (current.length && !this.boxOf(candidate).fitsIn(this.limit)) { boxes.push(current); current = [item]; }
      else current = candidate;
    }
    if (current.length) boxes.push(current);
    order.markPacked();
    return boxes.map(items => new Package(`${order.id}-PKG${++this.seq}`, order.id, items, this.boxOf(items)));
  }

  private boxOf(items: Item[]): Dimensions {
    return new Dimensions(
      Math.max(...items.map(i => i.dimensions.length)),
      Math.max(...items.map(i => i.dimensions.width)),
      items.reduce((h, i) => h + i.dimensions.height, 0),
    );
  }
}
