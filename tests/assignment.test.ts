import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LockerSize } from '../src/enums/LockerSize.js';
import { LockerState } from '../src/enums/LockerState.js';
import { Dimensions } from '../src/model/Dimensions.js';
import { LockerLocation } from '../src/model/LockerLocation.js';
import { Order } from '../src/model/Order.js';
import { InMemoryLockerRepository } from '../src/repository/LockerRepository.js';
import { PackagingService } from '../src/service/PackagingService.js';
import { AtomicLockerAssigner, NoLockerAvailableError } from '../src/strategy/LockerAssigner.js';
import { SmallestFitStrategy } from '../src/strategy/LockerAssignmentStrategy.js';
import { asha, book, headphones, monitor } from '../src/fixtures.js';

const loc = () => LockerLocation.builder('L').named('L').at('x').withLockers(LockerSize.SMALL, 1).withLockers(LockerSize.LARGE, 1).build();

test('R4: smallest-fit ranks the smallest locker the package fits first', () => {
  const ranked = new SmallestFitStrategy().rank([...loc().lockers], new Dimensions(20, 18, 8));
  assert.deepEqual(ranked.map(l => l.size), [LockerSize.SMALL, LockerSize.LARGE]);
});

test('R9: two concurrent assignments for the last fitting locker: exactly one wins', async () => {
  const repo = new InMemoryLockerRepository([LockerLocation.builder('L').named('L').at('x').withLockers(LockerSize.MEDIUM, 1).build()], 2);
  const assigner = new AtomicLockerAssigner(repo, new SmallestFitStrategy());
  const box = new Dimensions(40, 30, 20);
  const results = await Promise.allSettled([assigner.assign('L', box, 'A'), assigner.assign('L', box, 'B')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const loser = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
  assert.ok(loser.reason instanceof NoLockerAvailableError);
  assert.equal((await repo.get('L-M-1')).state, LockerState.BOOKED);
});

test('a small package falls through to a bigger locker when the small one is taken', async () => {
  const repo = new InMemoryLockerRepository([loc()], 0);
  const assigner = new AtomicLockerAssigner(repo, new SmallestFitStrategy());
  const a = await assigner.assign('L', book.dimensions, 'A');
  const b = await assigner.assign('L', book.dimensions, 'B');
  assert.deepEqual([a.size, b.size], [LockerSize.SMALL, LockerSize.LARGE]);
});

test('R2: items are boxed together when they fit; a box never exceeds the largest locker', () => {
  const packs = new PackagingService().pack(new Order('O', asha, [headphones, book], 'L'));
  assert.equal(packs.length, 1);
  assert.equal(packs[0]!.items.length, 2);
  const many = new PackagingService().pack(new Order('O2', asha, [monitor, monitor, monitor, monitor], 'L'));
  assert.ok(many.length > 1);
});
