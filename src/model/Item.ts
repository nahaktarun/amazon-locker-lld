import { Dimensions } from './Dimensions.js';

export class Item {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly dimensions: Dimensions,
    readonly priceCents: number,
    readonly returnable: boolean = true,   // R12: refund policy is per product
  ) {}
}
