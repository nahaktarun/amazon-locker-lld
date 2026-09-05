import { LockerSize } from './enums/LockerSize.js';
import { Customer } from './model/Customer.js';
import { Dimensions } from './model/Dimensions.js';
import { Item } from './model/Item.js';
import { LockerLocation } from './model/LockerLocation.js';

export const asha = new Customer('C1', 'Asha', 'asha@example.com', '+91-98xxxx');
export const vikram = new Customer('C2', 'Vikram', 'vikram@example.com', '+91-99xxxx');

export const headphones = new Item('I1', 'Headphones', new Dimensions(20, 18, 8), 4_999_00);
export const book = new Item('I2', 'Paperback', new Dimensions(20, 13, 3), 499_00);
export const monitor = new Item('I3', '27in Monitor', new Dimensions(65, 45, 20), 18_999_00, false);   // not returnable
export const fridge = new Item('I4', 'Mini fridge', new Dimensions(95, 60, 60), 12_000_00);          // fits no locker

export const koramangala = () => LockerLocation.builder('LOC-KOR')
  .named('Amazon Locker - Koramangala').at('Forum Mall, Bengaluru')
  .openDaily('08:00', '22:00')
  .withLockers(LockerSize.EXTRA_SMALL, 2).withLockers(LockerSize.SMALL, 2).withLockers(LockerSize.MEDIUM, 1)
  .withLockers(LockerSize.LARGE, 1).withLockers(LockerSize.EXTRA_LARGE, 1).withLockers(LockerSize.DOUBLE_EXTRA_LARGE, 1)
  .build();
