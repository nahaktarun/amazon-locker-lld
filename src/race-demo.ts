import { LockerSize } from './enums/LockerSize.js';
import { Dimensions } from './model/Dimensions.js';
import { LockerLocation } from './model/LockerLocation.js';
import { InMemoryLockerRepository } from './repository/LockerRepository.js';
import { AtomicLockerAssigner, LockerAssigner, NaiveLockerAssigner } from './strategy/LockerAssigner.js';
import { SmallestFitStrategy } from './strategy/LockerAssignmentStrategy.js';

// R9 under pressure: one MEDIUM locker, two customers' packages, the same instant.
const location = () => LockerLocation.builder('L1').named('Race').at('x').withLockers(LockerSize.MEDIUM, 1).build();
const box = new Dimensions(40, 30, 20);

async function run(label: string, make: (repo: InMemoryLockerRepository) => LockerAssigner) {
  const repo = new InMemoryLockerRepository([location()], 3);
  const assigner = make(repo);
  const results = await Promise.allSettled([assigner.assign('L1', box, 'LP-A'), assigner.assign('L1', box, 'LP-B')]);
  const line = results.map(r => r.status === 'fulfilled' ? `booked ${r.value.id}` : `rejected: ${r.reason.message}`);
  const locker = await repo.get('L1-M-1');
  console.log(`${label}\n  A ${line[0]}\n  B ${line[1]}\n  locker L1-M-1 is ${locker.state}, assigned to ${locker.assignedTo}\n`);
}

await run('NAIVE   findAvailable → await → save', repo => new NaiveLockerAssigner(repo, new SmallestFitStrategy()));
await run('ATOMIC  rank → compare-and-set book()', repo => new AtomicLockerAssigner(repo, new SmallestFitStrategy()));
