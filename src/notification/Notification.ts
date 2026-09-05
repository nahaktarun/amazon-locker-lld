import { Customer } from '../model/Customer.js';

/** Adapter target: email, SMS, push all look like this to the rest of the system. */
export interface NotificationChannel { send(customer: Customer, subject: string, body: string): Promise<void>; }

export class EmailChannel implements NotificationChannel {
  async send(c: Customer, subject: string, body: string) { console.log(`  [email → ${c.email}] ${subject}: ${body}`); }
}
export class SmsChannel implements NotificationChannel {
  async send(c: Customer, subject: string, body: string) { console.log(`  [sms → ${c.phone}] ${subject}: ${body}`); }
}
/** Test double: remembers what was sent. */
export class RecordingChannel implements NotificationChannel {
  readonly sent: { to: string; subject: string; body: string }[] = [];
  async send(c: Customer, subject: string, body: string) { this.sent.push({ to: c.email, subject, body }); }
}
