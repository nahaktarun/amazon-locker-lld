import { LockerEvents } from './LockerEvents.js';
import { NotificationChannel } from './Notification.js';

/** R5, R8: every customer-facing message, in one place, triggered by events. */
export class CustomerNotifier {
  constructor(events: LockerEvents, private readonly channel: NotificationChannel) {
    events.on('PackageDelivered', ({ lockerPackage: lp, customer }) =>
      this.channel.send(customer, 'Your package is ready for pickup',
        `Locker ${lp.lockerId} at ${lp.locationId}. Code ${lp.code}. Collect by ${lp.code!.validTill.toLocaleString()}.`));
    events.on('PackagePickedUp', ({ lockerPackage: lp, customer }) =>
      this.channel.send(customer, 'Package collected', `Order ${lp.pkg.orderId} picked up from locker ${lp.lockerId}.`));
    events.on('PackageExpired', ({ lockerPackage: lp, customer, refundCents }) =>
      this.channel.send(customer, 'Package returned, refund issued', `Order ${lp.pkg.orderId} was not collected within 3 days. $${(refundCents / 100).toFixed(2)} refunded.`));
  }
}
