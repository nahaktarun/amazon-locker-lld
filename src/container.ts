import { LockerLocation } from './model/LockerLocation.js';
import { CodeGenerator, SixDigitCodeGenerator } from './model/AccessCode.js';
import { CustomerNotifier } from './notification/CustomerNotifier.js';
import { LockerEvents } from './notification/LockerEvents.js';
import { EmailChannel, NotificationChannel } from './notification/Notification.js';
import { InMemoryLockerRepository } from './repository/LockerRepository.js';
import { InMemoryLockerPackageRepository } from './repository/PackageRepositories.js';
import { LockerService } from './service/LockerService.js';
import { PackagingService } from './service/PackagingService.js';
import { AtomicLockerAssigner } from './strategy/LockerAssigner.js';
import { SmallestFitStrategy } from './strategy/LockerAssignmentStrategy.js';
import { Clock } from './util/Clock.js';

/** Composition root: the only file that knows the concrete classes. Tests swap the fakes in here. */
export function buildLockerSystem(opts: { locations: LockerLocation[]; clock: Clock; codes?: CodeGenerator; channel?: NotificationChannel; holdMs?: number }) {
  const events = new LockerEvents();
  const lockers = new InMemoryLockerRepository(opts.locations);
  const service = new LockerService(
    new Map(opts.locations.map(l => [l.id, l])),
    lockers,
    new InMemoryLockerPackageRepository(),
    new AtomicLockerAssigner(lockers, new SmallestFitStrategy()),
    new PackagingService(),
    opts.codes ?? new SixDigitCodeGenerator(),
    events,
    opts.clock,
    opts.holdMs,
  );
  new CustomerNotifier(events, opts.channel ?? new EmailChannel());
  return { service, events, lockers };
}
