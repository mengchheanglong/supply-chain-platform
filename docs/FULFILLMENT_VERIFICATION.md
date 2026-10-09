# OPS-03 local verification — 2026-10-09

Implemented demand, partial allocation batches, explicit pick/pack progress and shipment
draft/dispatch/cancel/observed-delivery commands. [Published policy](FULFILLMENT.md) defines
conservation, retry identity, managed reservations and the operational/planning boundary.
This is local evidence, not a production capacity, deployment or external carrier guarantee.

## Automated evidence

`pnpm test:integration` passed **29** configuration/real HTTP/PostGIS tests, including all
20 prior foundation/inventory checks and nine new workflow scenarios. The runner uses a
uniquely named disposable loopback-only PostGIS 18/3.6 container, generated credentials,
a non-superuser application role and two independent API instances. It removes its own
container afterward; no main stock/order fixtures are used.

New scenarios exercise:

- Two partial shipments complete a 10-unit order, with stock consumed only at dispatch;
  delivered and dispatched shipments remain distinguishable.
- Direct inventory release/ship of managed reservations rejects, including injected owner
  fields. Draft cancellation/replacement and allocation/order cancellation restore demand
  and available stock according to the published transitions.
- Eighteen simultaneous allocation requests against seven units of demand succeed exactly
  seven times. Twenty requests against thirteen remaining stock units succeed thirteen times.
  Both checks run across two APIs and reconcile inventory afterward.
- Twelve normalized allocation retries create one batch/reservation. Dispatch/cancel races
  have one winner. Twelve dispatch retries share one movement and original receipt.
- Forbidden pick/pack/shipment/order transitions, invalid calendar timestamps, delivery
  before dispatch and excessive future observations reject without another stock deduction.
- A deliberately failed shipment audit, after inventory consumption and demand projection
  changes, rolls back movement, balance/reservation, allocation, order, shipment and receipts.
  The same parent request then succeeds after the injected failure is removed.
- Tenant and reader rejection, forced row-policy empty unscoped reads, strict nested DTOs,
  append-only receipts, immutable allocation quantities and tenant/resource/order cursor scope.
- Multi-SKU demand, exact fractional units, line-order-independent retries and a shortage
  command succeeding under the same key after a subsequent receipt.
- Allocation and shipment pages enforce bounds, return distinct records across pages and
  reject cursors from another order.

`pnpm install --frozen-lockfile` passed with the existing lockfile and no dependency changes.
`pnpm verify` passed builds/typechecks, generated contract freshness, enforced module/browser
imports, **2 boundary tests** and **11 frontend tests**. The three new frontend scenarios
verify identical unconfirmed dispatch retry, disabled competing transitions, stale-detail
hiding on refresh failure, disconnect clearing and reader-only inspection. Existing inventory,
master-data and session regression tests continue passing. Total: **42 tests**.

## Real browser evidence

The agent-browser skill exercised the Vite UI and real API against the disposable browser
fixture: create a SKU, receive 10, create a 10-unit demand order, allocate 4, explicitly pick
and pack, create a draft shipment and attempt dispatch while persistence readiness was
unavailable. The UI retained the exact pending command and disabled competing actions.
After restoring readiness, the same-command retry dispatched once. Observed delivery used
a distinct evidence reference and an explicit UTC timestamp.

A separate 2-unit allocation was cancelled, restoring its demand and reservation availability.
Inventory showed on-hand 6, reserved 0, available 6; ledger contained exactly receive +10 and
ship −4, and reconciliation passed. Managed reservations had no standalone transition buttons.
No browser JavaScript errors were reported. Screenshots are ignored local artifacts under
the parent `runtime/ops03-complete.png` and `runtime/ops03-unconfirmed.png`; the former precedes
the final SKU-name/unit display refinement. Backend/build/frontend gates passed after that
refinement. Browser session, QA processes, temporary credential artifact and test container
were removed.

## Local schema and workspace

Migration **003_fulfillment_and_shipping.sql** is applied in the main local operational
database. Repeated `pnpm migrate` succeeds and verifies existing 001/002 checksums. A read-only
readiness probe reports database/PostGIS/migrations/restrictedRole all true and the three
expected migration names. No operational tenant, stock or workflow fixture was seeded in main.
Migration 003 is now immutable; future evolution must add another migration.

Parent `scripts/Validate.ps1` passes. The retired marketplace Git status remains clean.
Root/platform sources are still the existing local untracked repositories; no remote, push
or deployment is performed. Existing simulator/Rust baseline issues are outside this slice.

## Remaining limits and next slice

One shipment owns one immutable batch. Multi-batch loading, transfers, returns/adjustments,
carrier routing/stops and durable operator retry recovery remain future work. Delivery evidence
is an authorized observation, not an authenticated external carrier integration. No dedicated
workflow throughput/SLO benchmark was run; concurrent correctness checks establish no capacity.
OIDC/user lifecycle, runtime/migration-role separation, backups/restores and pilot controls
remain pending. Simulation still receives no operational credentials or write path.

Next main-project task: **DATA-01** validated source import, quality reporting and authorized
read-only export. Apply the accepted worker/outbox/artifact design when durable work is introduced;
DATA-02 then adds approved immutable tenant-scoped planning snapshots.
