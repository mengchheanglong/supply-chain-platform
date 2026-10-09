# Demand, fulfillment and shipment policy (OPS-03)

This local vertical slice adds real operational records. Test fixtures are explicitly synthetic.
Simulation, routing and optimization cannot authorize these commands.

## Ownership and transaction boundary

Fulfillment owns orders, demand lines and allocation batches. Shipping owns shipment progress
and delivery evidence. Shipping calls fulfillment's published transaction participants;
fulfillment calls inventory's published commands using the same checked-out database client.
Dependencies are acyclic: shipping → fulfillment → inventory → facilities/catalog/audit.
Repositories mutate their own tables only. Additive migration 003 preserves migrations 001/002.

Commands require an operator actor; readers may inspect tenant-scoped records. Public input
cannot choose a tenant or reservation owner. Forced row policies and tenant-bearing foreign
keys supplement application authorization. Runtime/migration role separation remains a pilot gate.

## Demand and quantity conservation

An order has one fulfillment facility, an opaque customer reference and 1–50 distinct SKU
lines. Units and decimal precision come from the SKU. Quantity inputs are positive bounded
decimal strings, processed as exact integer atoms; no implicit conversion or floating arithmetic.
Line order is irrelevant to normalized retry identity. Demand lines retain SKU code/name snapshots for operator display.

For every line:

`requested = remaining + active allocation + dispatched`

Active allocation includes allocated, picked and packed batches. Each batch has a fixed
quantity and a single inventory reservation. Partial fulfillment creates smaller batches,
then additional batches for remaining demand. It does not split or partially consume an
existing reservation. Cancellation subtracts the batch from active demand and releases its
whole reservation. Dispatch transfers its quantity from active allocation to dispatched,
consumes the whole reservation and inserts one negative inventory movement.

The order row serializes all its allocation/shipment commands before inventory stock and
reservation locks. Inventory still serializes commands for a stock key across orders and API
instances. Commands use a transaction-scoped advisory lock for their tenant/domain/retry key.
Queries and history pages are bounded; UUID order is stable, not chronological. The detail
query holds the order lock while reading its bounded lines to avoid mixed projections.

## Allowed transitions

| Record | Allowed transition | Meaning |
|---|---|---|
| Order | open → partially_shipped → fulfilled; open → fulfilled | Some/all demand has been dispatched |
| Order | open → cancelled | No active allocation and no dispatched quantity; cancel batches first |
| Allocation | allocated → picked → packed → shipped | Explicit picking, packing and shipment dispatch |
| Allocation | allocated/picked/packed → cancelled | Release stock; packed batches require draft-shipment cancellation first |
| Shipment | draft → dispatched → delivered | Dispatch consumes stock; delivery records observed evidence |
| Shipment | draft → cancelled | Release shipment claim; packed allocation remains reserved |

Terminal transitions are rejected under a new command key. Identical successful retries
return the original receipt even after state advances. One shipment claims one packed batch;
a cancelled draft can be replaced. Multi-batch loading, transfer/return/adjustment flows,
carrier stops, manifests and routing are outside this slice.

`fulfilled` means all demand dispatched, not delivered. Delivery requires a source system,
source reference identifying evidence and a valid UTC `observedAt` calendar timestamp, at or
after dispatch and no more than five minutes ahead of the server clock. Evidence is recorded
as an operator observation; this slice does not verify an external carrier's authenticity.
No GPS, synthetic route or simulated arrival creates a delivery transition.

## Command receipts and audit

Every command includes a UUID `idempotencyKey`, source system and event reference. Completed
fulfillment and shipping command tables store normalized fingerprints and original receipts.
Keys are scoped by tenant and domain. Reusing a key for changed input, or applying the same
source event under a new key for the same action, rejects. Failed commands retain no receipt
and may be retried after the cause is corrected. Source event references are distinct per action.

Inventory children use generated internal retry keys and `fulfillment` source references tied
to the allocation/action. They commit with the parent state, projections, parent receipt and
audit. A failure at any step rolls everything back. Parent retry never generates another child
after a successful commit. Audit parent keys are separate from inventory child keys.

Workflow reservations expose an immutable owner. Standalone inventory release/ship endpoints
reject them; only the owning transaction participant can consume/release them. The UI labels
them as managed by fulfillment and removes standalone transition controls.

## HTTP and operator UI

Generated `/api/v1/fulfillment` routes include paged `GET orders`, `GET order?orderId`,
`GET allocations?orderId`, and `POST orders`, `allocate`, `pick`, `pack`, `cancel-allocation`,
`cancel-order`. Shipping exposes paged `GET /api/v1/shipping/shipments?orderId` and `POST`
`create`, `dispatch`, `cancel`, `deliver`. List limits default to 50 and cannot exceed 200;
cursor identities bind tenant, resource and order. Nested DTOs reject unknown fields.

The lazy fulfillment web route supports multi-line demand drafts, scoped master pickers,
paged registers, partial allocations and explicit transitions. Source references are cleared
after success. Cached data does not authorize a command. Writes have no automatic retries or
optimistic stock/state changes. Unconfirmed writes retain the exact request and key while the
page stays mounted and disable competing commands until the same request recovers. Explicit
rejections may be edited. Refresh failures hide stale details/controls. Disconnect aborts
requests and clears tenant/session query state. Reloading/leaving loses the in-memory pending
request; a durable operator recovery inbox remains future work.

No durable job, Redis, outbox or worker is needed for this synchronous slice. Introduce the
accepted worker/outbox design with DATA-01's first durable import/export workflow.
