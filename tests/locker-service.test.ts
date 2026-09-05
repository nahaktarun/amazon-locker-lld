import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLockerSystem } from '../src/container.js';
import { LockerState } from '../src/enums/LockerState.js';
import { FixedCodeGenerator } from '../src/model/AccessCode.js';
import { LockerPackageStatus } from '../src/model/LockerPackage.js';
import { Order } from '../src/model/Order.js';
import { ReturnStatus } from '../src/model/ReturnPackage.js';
import { RecordingChannel } from '../src/notification/Notification.js';
import { LocationClosedError } from '../src/service/LockerService.js';
import { FixedClock } from '../src/util/Clock.js';
import { asha, book, headphones, koramangala, monitor, vikram } from '../src/fixtures.js';

function setup() {
  const clock = new FixedClock(new Date('2026-09-07T10:00:00'));
  const channel = new RecordingChannel();
  const sys = buildLockerSystem({ locations: [koramangala()], clock, channel, codes: new FixedCodeGenerator(['111111', '222222', '333333']) });
  return { ...sys, clock, channel };
}
const lookup = (id: string) => (id === asha.id ? asha : vikram);

test('R1-R5: order → packed → locker booked → delivered → customer emailed the code', async () => {
  const { service, lockers, channel } = setup();
  const [lp] = await service.assignLockers(new Order('O1', asha, [headphones, book], 'LOC-KOR'));
  assert.equal((await lockers.get(lp!.lockerId)).state, LockerState.BOOKED);
  await service.deliver(lp!.id, asha);
  assert.equal((await lockers.get(lp!.lockerId)).state, LockerState.OCCUPIED);
  assert.match(channel.sent[0]!.body, /111111/);
});

test('R7/R10: pickup only in opening hours; code single-use; locker released', async () => {
  const { service, lockers, clock } = setup();
  const [lp] = await service.assignLockers(new Order('O1', asha, [book], 'LOC-KOR'));
  await service.deliver(lp!.id, asha);
  clock.set(new Date('2026-09-07T22:30:00'));
  await assert.rejects(service.pickUp('LOC-KOR', '111111', asha), LocationClosedError);
  clock.set(new Date('2026-09-08T09:00:00'));
  await service.pickUp('LOC-KOR', '111111', asha);
  assert.equal(lp!.status, LockerPackageStatus.PICKED_UP);
  assert.equal((await lockers.get(lp!.lockerId)).state, LockerState.AVAILABLE);
  await assert.rejects(service.pickUp('LOC-KOR', '111111', asha));
});

test('R6/R8: after three days the package is removed, the locker released, the customer refunded', async () => {
  const { service, lockers, clock, channel } = setup();
  const [lp] = await service.assignLockers(new Order('O1', vikram, [monitor], 'LOC-KOR'));
  await service.deliver(lp!.id, vikram);
  clock.set(new Date('2026-09-10T09:59:59'));
  assert.equal((await service.processExpired(lookup)).length, 0);
  clock.set(new Date('2026-09-10T10:00:00'));
  assert.equal((await service.processExpired(lookup)).length, 1);
  assert.equal(lp!.status, LockerPackageStatus.REMOVED);
  assert.equal((await lockers.get(lp!.lockerId)).state, LockerState.AVAILABLE);
  assert.match(channel.sent.at(-1)!.subject, /refund/);
});

test('R11/R12: return uses two codes; refund follows product eligibility', async () => {
  const { service, lockers, channel } = setup();
  const order = new Order('O1', asha, [headphones, monitor], 'LOC-KOR');
  const ret = await service.requestReturn(asha, order, headphones, 'LOC-KOR');
  assert.equal(ret.status, ReturnStatus.REQUESTED);
  await assert.rejects(service.collectReturn('LOC-KOR', ret.customerCode!.value, asha));      // wrong role, wrong code
  await service.dropReturn('LOC-KOR', ret.customerCode!.value, asha);
  assert.equal(ret.customerCode, null);
  assert.ok(ret.logisticsCode);
  await service.collectReturn('LOC-KOR', ret.logisticsCode!.value, asha);
  assert.equal(ret.status, ReturnStatus.COLLECTED);
  assert.equal((await lockers.get(ret.lockerId)).state, LockerState.AVAILABLE);
  assert.match(channel.sent.at(-1)!.body, /refunded/);
  const ret2 = await service.requestReturn(asha, order, monitor, 'LOC-KOR');
  await service.dropReturn('LOC-KOR', ret2.customerCode!.value, asha);
  await service.collectReturn('LOC-KOR', ret2.logisticsCode!.value, asha);
  assert.match(channel.sent.at(-1)!.body, /not eligible/);
});

test('an order needing two lockers when only one fits is rolled back entirely', async () => {
  const { service, lockers } = setup();
  await assert.rejects(service.assignLockers(new Order('O1', asha, [monitor, monitor, monitor, monitor, monitor, monitor], 'LOC-KOR')));
  const free = await lockers.findAvailable('LOC-KOR');
  assert.equal(free.length, koramangala().lockers.length);
});
