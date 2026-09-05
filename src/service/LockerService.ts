import { AccessCode, CodeGenerator } from '../model/AccessCode.js';
import { Customer } from '../model/Customer.js';
import { Item } from '../model/Item.js';
import { InvalidCodeError, LockerPackage } from '../model/LockerPackage.js';
import { LockerLocation } from '../model/LockerLocation.js';
import { Order } from '../model/Order.js';
import { ReturnPackage, ReturnStatus } from '../model/ReturnPackage.js';
import { LockerEvents } from '../notification/LockerEvents.js';
import { LockerRepository } from '../repository/LockerRepository.js';
import { LockerPackageRepository, ReturnRepository } from '../repository/PackageRepositories.js';
import { LockerAssigner } from '../strategy/LockerAssigner.js';
import { Clock } from '../util/Clock.js';
import { PackagingService } from './PackagingService.js';

export class LocationClosedError extends Error {
  constructor(loc: LockerLocation) { super(`${loc.name} is closed now (open ${loc.hours})`); this.name = 'LocationClosedError'; }
}

/** How long a code lives. R6: three days for deliveries. Returns get the same window unless told otherwise. */
export const THREE_DAYS_MS = 3 * 24 * 3_600_000;

/**
 * Facade over the whole flow. Sequences the steps; owns no rules of its own.
 * No `new Date()`, no status strings, no email, no locker state writes: those live in the collaborators.
 */
export class LockerService {
  private seq = 0;

  constructor(
    private readonly locations: Map<string, LockerLocation>,
    private readonly lockers: LockerRepository,
    private readonly lockerPackages: LockerPackageRepository,
    private readonly returns: ReturnRepository,
    private readonly assigner: LockerAssigner,
    private readonly packaging: PackagingService,
    private readonly codes: CodeGenerator,
    private readonly events: LockerEvents,
    private readonly clock: Clock,
    private readonly holdMs: number = THREE_DAYS_MS,
  ) {}

  // ── Delivery flow ────────────────────────────────────────────────────────────

  /** R1, R2, R4, R9: at dispatch, pack the order and book a locker per package. Fails before anything ships. */
  async assignLockers(order: Order): Promise<LockerPackage[]> {
    const location = this.location(order.lockerLocationId);
    const packages = this.packaging.pack(order);
    const assigned: LockerPackage[] = [];
    try {
      for (const pkg of packages) {
        const id = `LP-${String(++this.seq).padStart(4, '0')}`;
        const locker = await this.assigner.assign(location.id, pkg.dimensions, id);
        const lp = new LockerPackage(id, pkg, locker.id, location.id, order.customer.id, now => new AccessCode(this.codes.next(), new Date(now.getTime() + this.holdMs)));
        await this.lockerPackages.save(lp);
        assigned.push(lp);
      }
    } catch (err) {
      for (const lp of assigned) { lp.remove(); await this.lockers.release(lp.lockerId); }   // all or nothing for the order
      throw err;
    }
    return assigned;
  }

  /** R5: the carrier puts the package in the locker; the customer gets the code. */
  async deliver(lockerPackageId: string, customer: Customer): Promise<LockerPackage> {
    const lp = await this.lockerPackages.get(lockerPackageId);
    lp.deliver(this.clock.now());                        // state decides legality; code issued with validTill = now + 3 days
    await this.lockers.occupy(lp.lockerId);
    this.events.emit('PackageDelivered', { lockerPackage: lp, customer });
    return lp;
  }

  /** R7, R10: the customer types the code at the kiosk during opening hours; the code identifies the package. */
  async pickUp(locationId: string, code: string, customer: Customer): Promise<LockerPackage> {
    const location = this.location(locationId);
    const now = this.clock.now();
    if (!location.isOpenAt(now)) throw new LocationClosedError(location);
    const candidates = await this.lockerPackages.findDelivered(locationId);
    const lp = candidates.find(c => c.code?.matches(code));
    if (!lp) throw new InvalidCodeError();                // says nothing about which packages exist
    lp.pickUp(code, now);                                 // checks validity again, clears the code (R10)
    await this.lockers.release(lp.lockerId);              // R10: locker closed, locked, available again
    this.events.emit('PackagePickedUp', { lockerPackage: lp, customer });
    return lp;
  }

  /** R6, R8: scheduled job. Expired packages are removed by logistics, lockers released, customers refunded. */
  async processExpired(customerLookup: (id: string) => Customer): Promise<LockerPackage[]> {
    const now = this.clock.now();
    const expired: LockerPackage[] = [];
    for (const lp of await this.lockerPackages.findDelivered()) {
      if (lp.code && lp.code.isValidAt(now)) continue;
      lp.expire(now);
      lp.remove();                                        // logistics takes it out; in real life a separate scan
      await this.lockers.release(lp.lockerId);
      this.events.emit('PackageExpired', { lockerPackage: lp, customer: customerLookup(lp.customerId), refundCents: lp.pkg.valueCents });
      expired.push(lp);
    }
    return expired;
  }

  // ── Return flow ──────────────────────────────────────────────────────────────

  /** R11: assign a locker at the chosen location for the return; send the customer a code to open it. */
  async requestReturn(customer: Customer, order: Order, item: Item, locationId: string): Promise<ReturnPackage> {
    if (!order.items.includes(item)) throw new Error(`${item.name} is not part of order ${order.id}`);
    const location = this.location(locationId);
    const id = `RET-${String(++this.seq).padStart(4, '0')}`;
    const locker = await this.assigner.assign(location.id, item.dimensions, id);
    const now = this.clock.now();
    const code = (at: Date) => new AccessCode(this.codes.next(), new Date(at.getTime() + this.holdMs));
    const ret = new ReturnPackage(id, item, order.id, customer.id, locker.id, location.id, code(now), code);
    await this.returns.save(ret);
    this.events.emit('ReturnRequested', { ret, customer });
    return ret;
  }

  /** R11: customer opens the locker with their code and drops the item. A logistics code is issued. */
  async dropReturn(locationId: string, code: string, customer: Customer): Promise<ReturnPackage> {
    const location = this.location(locationId);
    const now = this.clock.now();
    if (!location.isOpenAt(now)) throw new LocationClosedError(location);
    const ret = (await this.returns.findByStatus(locationId, ReturnStatus.REQUESTED)).find(r => r.customerCode?.matches(code));
    if (!ret) throw new InvalidCodeError();
    ret.drop(code, now);
    await this.lockers.occupy(ret.lockerId);
    this.events.emit('ReturnDropped', { ret, customer });
    return ret;
  }

  /** R12: logistics collects with its own code; the locker is released and the refund policy applied. */
  async collectReturn(locationId: string, code: string, customer: Customer): Promise<ReturnPackage> {
    const ret = (await this.returns.findByStatus(locationId, ReturnStatus.DROPPED)).find(r => r.logisticsCode?.matches(code));
    if (!ret) throw new InvalidCodeError();
    ret.collect(code, this.clock.now());
    await this.lockers.release(ret.lockerId);
    this.events.emit('ReturnCollected', { ret, customer, refundCents: ret.item.returnable ? ret.item.priceCents : 0 });
    return ret;
  }

  private location(id: string): LockerLocation {
    const loc = this.locations.get(id);
    if (!loc) throw new Error(`Locker location ${id} not found`);
    return loc;
  }
}
