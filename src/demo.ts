import { buildLockerSystem } from './container.js';
import { asha, book, fridge, headphones, koramangala, monitor, vikram } from './fixtures.js';
import { Order } from './model/Order.js';
import { FixedClock } from './util/Clock.js';

const clock = new FixedClock(new Date('2026-09-07T10:00:00'));   // Monday
const loc = koramangala();
const { service, lockers } = buildLockerSystem({ locations: [loc], clock });
const customers = { [asha.id]: asha, [vikram.id]: vikram };
const show = (k: string, v: unknown) => console.log(k.padEnd(36), v);

console.log(`\n${loc.name} · ${loc.hours} · lockers:`, loc.countBySize());

console.log('\n— R1/R2/R4/R9 · Order placed, packed, lockers booked at dispatch');
const order = new Order('ORD-1', asha, [headphones, book], loc.id);
const [lp] = await service.assignLockers(order);
show('packages:', 1); show('locker booked:', `${lp!.lockerId} (${lockers.sizeOf(lp!.lockerId)}) → ${lp!.status}`);
await service.assignLockers(new Order('ORD-2', vikram, [fridge], loc.id)).catch(e => show('fridge order rejected:', e.message));

console.log('\n— R5 · Carrier delivers; customer gets a 6-digit code valid for 3 days');
await service.deliver(lp!.id, asha);
show('code / valid till:', `${lp!.code} / ${lp!.code!.validTill.toLocaleString()}`);

console.log('\n— R7/R10 · Pickup: outside hours, wrong code, right code, reuse');
clock.set(new Date('2026-09-07T23:00:00'));
await service.pickUp(loc.id, lp!.code!.value, asha).catch(e => show('at 23:00:', e.message));
clock.set(new Date('2026-09-08T09:00:00'));
await service.pickUp(loc.id, '000000', asha).catch(e => show('wrong code:', e.message));
const code = lp!.code!.value;
await service.pickUp(loc.id, code, asha);
show('after pickup:', `${lp!.status}, locker ${(await lockers.get(lp!.lockerId)).state}`);
await service.pickUp(loc.id, code, asha).catch(e => show('same code again:', e.message));

console.log('\n— R6/R8 · Uncollected for 3 days: removed, locker released, refund');
const [lp2] = await service.assignLockers(new Order('ORD-3', vikram, [monitor], loc.id));
await service.deliver(lp2!.id, vikram);
clock.set(new Date('2026-09-11T08:59:00')); show('sweep at 3d - 1min:', (await service.processExpired(id => customers[id]!)).length);
clock.set(new Date('2026-09-11T09:00:00')); show('sweep at exactly 3d:', (await service.processExpired(id => customers[id]!)).map(x => `${x.id} → ${x.status}`));
show('locker after removal:', (await lockers.get(lp2!.lockerId)).state);

console.log('\n— R11/R12 · Return: customer code to drop, logistics code to collect, refund per product');
const ret = await service.requestReturn(asha, order, headphones, loc.id);
show('return locker / customer code:', `${ret.lockerId} / ${ret.customerCode}`);
await service.dropReturn(loc.id, ret.customerCode!.value, asha);
show('after drop:', `${ret.status}, logistics code ${ret.logisticsCode}`);
await service.collectReturn(loc.id, ret.logisticsCode!.value, asha);
show('after collection:', `${ret.status}, locker ${(await lockers.get(ret.lockerId)).state}`);
const ret2 = await service.requestReturn(vikram, new Order('ORD-4', vikram, [monitor], loc.id), monitor, loc.id);
await service.dropReturn(loc.id, ret2.customerCode!.value, vikram);
await service.collectReturn(loc.id, ret2.logisticsCode!.value, vikram);
console.log();
