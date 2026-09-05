# Amazon Locker Service · LLD case study

Node.js Backend Track · LLD module wrap-up. One low-level design problem, worked the way an LLD interview round runs: requirements, clarifying questions, entities, diagrams, then code, one commit per design step.

**Student deck:** https://nahaktarun.github.io/amazon-locker-lld/
**Walk the design step by step:** `git log --oneline --reverse`

## Problem definition

Amazon is an online retailer that allows customers to order products for delivery. Sometimes customers are unavailable at their usual address to receive packages. In such cases, Amazon provides a secure, automated pickup and return service called Amazon Locker.

Amazon Lockers are available at various locations, each containing multiple lockers of different sizes and operating hours. Customers can select a nearby locker location for delivery or returns. Only packages that fit a locker's size are eligible. When a package arrives, the customer receives a unique code to retrieve it. Packages are stored for a limited period; if uncollected, they are removed and the customer may be refunded. Customers can also return eligible products by dropping them off at available locker locations, where the logistics team picks them up.

## Requirements

| | Requirement |
|---|---|
| R1 | Customers can select a preferred locker location for order pickup during checkout. |
| R2 | An order may contain one or more items. Based on locker size availability, items are packaged together if possible. |
| R3 | Locker locations contain multiple lockers of various sizes (extra small, small, medium, large, extra large, double extra large). |
| R4 | Only packages that fit fully within the locker's interior dimensions are eligible for delivery. |
| R5 | When a package is delivered to the selected locker, the customer receives a unique code (a 6-digit PIN) to open the locker. |
| R6 | Packages are held in the locker for three days. |
| R7 | Each locker location has defined opening and closing hours; customers must pick up within the 3-day window and the location's operating hours. |
| R8 | If a package is not picked up within three days, it is removed, the locker is released, and the customer is refunded. |
| R9 | Multiple lockers are available at every location; each can only be assigned to one customer/package at a time. |
| R10 | Once a package is collected, the locker is closed and locked; the access code is invalidated and cannot be reused. |
| R11 | Customers may return eligible items by selecting a nearby locker location. An available locker is assigned by package size; a new unique code lets the customer open it and place the return. |
| R12 | The logistics team collects returned items using its own unique code. The customer is notified once the return is processed and the refund policy is applied per product. |

## Run it

```
npm install
npm run demo    # every requirement R1-R12 exercised end to end, with a fixed clock
npm run race    # R9 under concurrency: naive double booking vs atomic compare-and-set
npm test        # 13 tests: lifecycle, assignment, packaging, service flows, returns
npm run typecheck
```

## Design

Bottom-up: entities first, then the flows over them, then the cross-cutting concerns (time, concurrency, notifications).

```
src/enums/         LockerSize (R3, with interior dimensions), LockerState (R9)
src/model/         Dimensions, Customer, Item, Order, Package (R1, R2, R4)
                   OperatingHours, Locker, LockerLocation + Builder (R3, R7)
                   AccessCode + CodeGenerator (R5, R10)
                   LockerPackage + state machine (R5, R6, R8, R10), ReturnPackage (R11, R12)
src/repository/    LockerRepository with atomic book() (R9), package/return repositories
src/strategy/      LockerAssignmentStrategy (smallest fit, first fit), LockerAssigner (claim loop)
src/notification/  LockerEvents (observer), NotificationChannel adapters, CustomerNotifier
src/service/       PackagingService (R2), LockerService facade (all flows)
src/util/          Clock
src/container.ts   composition root
docs/              decks and diagrams
```

### Design patterns

| Pattern | Where | Why |
|---|---|---|
| Builder | `LockerLocation.builder()` | a location with six locker sizes and hours is configured, then validated once |
| State | `LockerPackage` states | BOOKED → DELIVERED → PICKED_UP / EXPIRED → REMOVED without a single `if (status === ...)` |
| Strategy | `LockerAssignmentStrategy`, `CodeGenerator` | smallest-fit vs first-fit; random vs fixed codes in tests |
| Repository | `LockerRepository.book()` | locker writes are atomic compare-and-set, so two customers never share a locker (R9) |
| Observer | `LockerEvents` | notifications, metrics and audit subscribe; the service never mentions email |
| Adapter | `NotificationChannel` | email, SMS, a recording fake for tests |
| Facade | `LockerService` | one entry point for delivery, pickup, expiry and returns |
| Value object | `Dimensions`, `AccessCode` | immutable, compared by value, own their rules (rotation, constant-time match) |

## Diagrams

See `docs/diagrams/` (Mermaid): use case, class, sequence (delivery, pickup, return) and activity (pickup with expiry).
