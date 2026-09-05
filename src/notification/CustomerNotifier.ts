import { LockerEvents } from './LockerEvents.js';
import { NotificationChannel } from './Notification.js';

/** R5, R8, R11, R12: every customer-facing message, in one place, triggered by events. */
export class CustomerNotifier {
  constructor(events: LockerEvents, private readonly channel: NotificationChannel) {
    events.on('PackageDelivered', ({ lockerPackage: lp, customer }) =>
      this.channel.send(customer, 'Your package is ready for pickup',
        `Locker ${lp.lockerId} at ${lp.locationId}. Code ${lp.code}. Collect by ${lp.code!.validTill.toLocaleString()}.`));
    events.on('PackagePickedUp', ({ lockerPackage: lp, customer }) =>
      this.channel.send(customer, 'Package collected', `Order ${lp.pkg.orderId} picked up from locker ${lp.lockerId}.`));
    events.on('PackageExpired', ({ lockerPackage: lp, customer, refundCents }) =>
      this.channel.send(customer, 'Package returned, refund issued', `Order ${lp.pkg.orderId} was not collected within 3 days. $${(refundCents / 100).toFixed(2)} refunded.`));
    events.on('ReturnRequested', ({ ret, customer }) =>
      this.channel.send(customer, 'Return locker assigned', `Drop ${ret.item.name} in locker ${ret.lockerId} at ${ret.locationId} using code ${ret.customerCode}.`));
    events.on('ReturnDropped', ({ ret, customer }) =>
      this.channel.send(customer, 'Return received', `${ret.item.name} is in locker ${ret.lockerId}. We will collect it shortly.`));
    events.on('ReturnCollected', ({ ret, customer, refundCents }) =>
      this.channel.send(customer, 'Return processed', refundCents > 0 ? `$${(refundCents / 100).toFixed(2)} refunded for ${ret.item.name}.` : `${ret.item.name} is not eligible for a refund.`));
  }
}
