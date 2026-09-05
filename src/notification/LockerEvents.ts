import { Customer } from '../model/Customer.js';
import { LockerPackage } from '../model/LockerPackage.js';

/** Observer: the service emits; subscribers (notifications, metrics, audit) listen. The service never knows who. */
export interface LockerEventMap {
  PackageDelivered: { lockerPackage: LockerPackage; customer: Customer };
  PackagePickedUp: { lockerPackage: LockerPackage; customer: Customer };
  PackageExpired: { lockerPackage: LockerPackage; customer: Customer; refundCents: number };
}
export type Listener<K extends keyof LockerEventMap> = (payload: LockerEventMap[K]) => void;

export class LockerEvents {
  private readonly listeners = new Map<keyof LockerEventMap, Array<(p: never) => void>>();
  on<K extends keyof LockerEventMap>(name: K, listener: Listener<K>): () => void {
    const list = this.listeners.get(name) ?? [];
    list.push(listener as (p: never) => void);
    this.listeners.set(name, list);
    return () => this.listeners.set(name, (this.listeners.get(name) ?? []).filter(l => l !== listener));
  }
  emit<K extends keyof LockerEventMap>(name: K, payload: LockerEventMap[K]): void {
    for (const l of this.listeners.get(name) ?? []) {
      try { l(payload as never); } catch (err) { console.error(`[events] ${name} listener failed:`, (err as Error).message); }
    }
  }
}
