import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AccessCode } from '../src/model/AccessCode.js';
import { Dimensions } from '../src/model/Dimensions.js';
import { InvalidCodeError, InvalidTransitionError, LockerPackage, LockerPackageStatus } from '../src/model/LockerPackage.js';
import { Package } from '../src/model/Package.js';
import { book } from '../src/fixtures.js';

const t0 = new Date('2026-09-07T10:00:00');
const DAY = 24 * 3_600_000;
const make = () => new LockerPackage('LP1', new Package('P1', 'O1', [book], new Dimensions(20, 13, 3)), 'L1', 'LOC', 'C1',
  now => new AccessCode('123456', new Date(now.getTime() + 3 * DAY)));

test('R5/R10: booked → delivered issues a code; pickup with it clears the code and it cannot be reused', () => {
  const lp = make();
  assert.equal(lp.status, LockerPackageStatus.BOOKED);
  assert.throws(() => lp.pickUp('123456', t0), InvalidTransitionError);
  lp.deliver(t0);
  assert.equal(lp.status, LockerPackageStatus.DELIVERED);
  assert.equal(lp.code?.value, '123456');
  lp.pickUp('123456', new Date(t0.getTime() + DAY));
  assert.equal(lp.status, LockerPackageStatus.PICKED_UP);
  assert.equal(lp.code, null);
  assert.throws(() => lp.pickUp('123456', t0), InvalidTransitionError);
});

test('wrong code is rejected without changing state', () => {
  const lp = make(); lp.deliver(t0);
  assert.throws(() => lp.pickUp('000000', t0), InvalidCodeError);
  assert.equal(lp.status, LockerPackageStatus.DELIVERED);
});

test('R6/R8: the code is valid until exactly three days; expiry is illegal before, legal at the boundary', () => {
  const lp = make(); lp.deliver(t0);
  const before = new Date(t0.getTime() + 3 * DAY - 1), at = new Date(t0.getTime() + 3 * DAY);
  assert.throws(() => lp.expire(before), InvalidTransitionError);
  assert.throws(() => lp.pickUp('123456', at), InvalidCodeError);
  lp.expire(at);
  assert.equal(lp.status, LockerPackageStatus.EXPIRED);
  lp.remove();
  assert.equal(lp.status, LockerPackageStatus.REMOVED);
});

test('R4: dimensions fit in any orientation', () => {
  assert.ok(new Dimensions(10, 30, 20).fitsIn(new Dimensions(30, 20, 10)));
  assert.ok(!new Dimensions(31, 1, 1).fitsIn(new Dimensions(30, 20, 10)));
});
