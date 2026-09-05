import { LockerPackage, LockerPackageStatus } from '../model/LockerPackage.js';

export interface LockerPackageRepository {
  save(lp: LockerPackage): Promise<void>;
  get(id: string): Promise<LockerPackage>;
  findDelivered(locationId?: string): Promise<LockerPackage[]>;
  findByCustomer(customerId: string, status: LockerPackageStatus): Promise<LockerPackage[]>;
}

export class InMemoryLockerPackageRepository implements LockerPackageRepository {
  private readonly items = new Map<string, LockerPackage>();
  async save(lp: LockerPackage) { this.items.set(lp.id, lp); }
  async get(id: string) { const x = this.items.get(id); if (!x) throw new Error(`LockerPackage ${id} not found`); return x; }
  async findDelivered(locationId?: string) {
    return [...this.items.values()].filter(x => x.status === LockerPackageStatus.DELIVERED && (!locationId || x.locationId === locationId));
  }
  async findByCustomer(customerId: string, status: LockerPackageStatus) {
    return [...this.items.values()].filter(x => x.customerId === customerId && x.status === status);
  }
}
