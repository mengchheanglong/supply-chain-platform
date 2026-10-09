# Inventory ledger and reservations — OPS-02

Implemented locally on 2026-10-09. This is a single-facility/SKU command slice, not a full
receiving or fulfillment workflow. [Verification](INVENTORY_VERIFICATION.md) records evidence.

## Quantity representation

Commands require a positive decimal **string**, a SKU unit and its facility/SKU references.
Accept at most 12 integer digits and 6 fractional digits, without signs, exponents, leading
zeros or implicit unit conversion. Trailing fractional zeros normalize away, so `10.00` and
`10` represent the same idempotent request. Nonzero fractions must fit the SKU precision.
`each` has precision zero; kg/m3/litre use the configured precision from 0 through 6.

Application arithmetic uses BigInt scaled atoms, never Number arithmetic for quantities.
PostgreSQL stores atoms as numeric(18,0); each balance is bounded by 999999999999999999 atoms.
Responses are decimal strings at the SKU precision, including signed movement deltas. Stock
metadata is pinned by a composite catalog foreign key; changing a stocked SKU's unit/precision
requires a separately designed migration/conversion workflow. The exact database numeric
representation follows [PostgreSQL numeric types](https://www.postgresql.org/docs/18/datatype-numeric.html).

## Command and state rules

| Command | Physical on-hand | Active reserved | Result |
|---|---|---|---|
| receive | Increase by quantity | Unchanged | Append positive movement with source receipt |
| reserve | Unchanged | Increase by quantity if availability permits | Create active reservation with source demand |
| release | Unchanged | Decrease by the entire active reservation | Mark released; no physical movement |
| ship | Decrease by entire active reservation | Decrease by the same quantity | Mark consumed; append negative movement |

Available = on-hand minus active reserved, with database constraints forbidding negative
on-hand/reserved/availability. A released/consumed reservation cannot transition again.
Only operator credentials can issue commands; readers can query. Tenant identity derives
from authorization. Foreign tenant references return not found; stock/command/history tables
also force tenant row policies and composite tenant-safe reference keys.

Partial consumption, transfers, adjustments, expiry, conversion and picking/packing/order/
shipment entities are not introduced here. Source demand/shipment references are external
identities, not proof that an internal order or shipment workflow exists.

## Idempotency, transaction and concurrency

Every command supplies a UUID idempotencyKey, sourceSystem and externalId. The key is unique
within a tenant. The normalized fingerprint includes action, stock/reservation references,
normalized quantity/unit where applicable and source identity. Same key and same fingerprint
returns the exact original successful receipt, even after stock has subsequently changed.
Changing the command under an existing key returns 409. A distinct key for an already-used
source event also rejects: source identity is unique per tenant/action, and reservation demand
identities are unique per tenant. Replays authenticate and authorize again.

Only **successful** results are persisted. A failed/rolled-back command can succeed later
with its original key, for example after stock is received. A 5xx/network timeout is an
unconfirmed result: retry the identical command/key to recover an existing commit or apply
it once if no commit occurred. Clients must not substitute a new source reference/key to
work around an unconfirmed result. The UI retains the pending request and disables edits,
with explicit same-command retry and no automatic mutation retry. This pending UI state is
in memory while the feature is mounted; retain its displayed command reference before
leaving/reloading an unconfirmed operation. Durable recovery UX is a later improvement.

The database locks each tenant/key transactionally before looking up its stored result.
It then creates/locks the balance row for the stock key; release/ship lock their reservation
only after the stock row. Different API instances share this database coordination. Advisory
hash collisions can serialize unrelated requests but cannot authorize or duplicate a command.
Locks release at transaction end; see [PostgreSQL locking](https://www.postgresql.org/docs/18/explicit-locking.html)
and [transaction advisory lock functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS).

Ledger movement, balance, reservation state, audit and completed result share one checked-out
client/transaction. Deferred command foreign keys allow the result to be inserted last while
still rejecting orphan history at commit. SQL uniqueness/constraints and all audit failures
roll back the entire command. Normal UPDATE/DELETE/TRUNCATE of ledger/results is blocked;
reservations allow only active-to-terminal state changes and cannot be deleted/truncated.
These controls do not restrict a migration owner who can alter triggers/policies.

InventoryService.executeIn is the published transaction participant for future fulfillment;
it does not open/commit a nested transaction. This slice changes one stock key per command.
Future multi-key orchestration must sort its stock keys consistently and preserve idempotency
and rollback boundaries. Lock/statement/pool timeouts are bounded; the API does not silently
retry transactions or acknowledge a failed command as successful.

## HTTP and queries

All endpoints below use `/api/v1/inventory` and authenticated tenant scope.

| Endpoint | Behavior |
|---|---|
| POST /receive, /reserve | StockCommandDto: facilityId, skuId, quantity string, unit, sourceSystem, externalId, idempotencyKey |
| POST /release, /ship | ReservationCommandDto: reservationId, sourceSystem, externalId, idempotencyKey |
| GET /balance | facilityId/skuId query; current onHand/reserved/available, unit and precision |
| GET /reservations, /movements | facilityId/skuId, optional limit 1–200 (default 50) and scoped cursor |
| GET /reconciliation | Compare balance projection with summed physical ledger and active reservation quantities |

Successful commands/replays return 201 with the saved versioned operational receipt. Stock
receipt values are historical results; GET /balance is the current-stock query. Unknown fields,
invalid quantity/unit/precision and malformed IDs reject with 400; unauthorized writes with
403; foreign/missing references with 404; insufficient stock, terminal states, reused keys/
source events and quantity-bound violations with 409; unavailable persistence with 503.

Query envelopes include schemaVersion, operational source, tenant and generatedAt. History
pages order by immutable UUID, not chronology; the movement table exposes recorded UTC times.
Cursors are scoped to tenant, stock key and resource. Pagination is not an immutable snapshot:
concurrent inserts may require a fresh first page. UI master selectors page 50 records and
history views page 10; queries are aborted/cleared with session changes and hide rows/balances
on failed refresh. Availability displayed in a browser never authorizes a reservation.

Reconciliation uses one SQL statement snapshot, reports consistency and does not repair stock.
Privileged SQL writes can corrupt projections; the UI blocks commands when reconciliation
reports a mismatch. Restrict runtime privileges and add audited repair workflows before pilot
use. Simulation/planning receives no operational command credentials or stock write path.

## Migration and execution

002_inventory_ledger.sql adds the new schema and extends audit actions without editing 001.
Run `pnpm migrate` after building. No tenants, SKUs, receipts or stock fixtures are seeded in
the main database. `pnpm test:integration` uses a disposable PostGIS database and sequential
file execution because synthetic outage/audit triggers deliberately affect the test schema.
`pnpm test:inventory-load` runs two APIs against one disposable database and records an ignored
runtime/inventory-load.json report. `pnpm test:browser` offers a disposable manual QA fixture.
