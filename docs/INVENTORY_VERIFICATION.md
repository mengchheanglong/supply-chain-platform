# OPS-02 — local inventory verification

Verified 2026-10-09 (Asia/Bangkok). Inventory command and quantity semantics live in
[INVENTORY.md](INVENTORY.md). Changes remain local; no remote/push/deployment was performed.

## Implemented slice

- Exact decimal-string commands and BigInt scaled arithmetic with bounded integer database
  storage. No floating-point stock arithmetic, negative availability or implicit conversion.
- Receive, reserve, full release and full shipment consumption, with transactional movement/
  balance/reservation/audit/result changes and database coordination shared across API instances.
- Tenant-scoped idempotency fingerprints and immutable successful receipts; repeated source
  events under another key reject. Terminal reservations cannot be consumed/released twice.
- Tenant-safe reference keys, forced row policies, immutable ledger/results, guarded reservation
  transitions and reconciliation against history. Public master-data ports own facility/SKU
  validation; inventory SQL does not reach into another module's private tables.
- Generated v1 HTTP contracts and a lazy inventory screen with paged master/history selection,
  exact stock display, source-referenced commands and explicit identical unconfirmed-command retry.

## Observed checks

| Check | Result |
|---|---|
| pnpm install --frozen-lockfile | Passed; no dependency versions changed |
| pnpm verify | Passed: builds/typechecks, generated-contract freshness, import gate, 2 boundary tests and 8 frontend tests |
| pnpm test:integration | Passed: 20 API/configuration/PostGIS tests, including 8 inventory cases |
| pnpm test:inventory-load | Passed: two APIs, 420 measured requests, no unexpected status/conservation failures |
| pnpm migrate + repeat migration | Passed against local main database; 001 checksum unchanged; 002 applied |
| Main database readiness | Actual database/PostGIS, both checksums and restricted role all ready |

Existing OPS-01/ARCH-01 regressions continue to pass. Inventory coverage includes exact fractional
and maximum scaled quantities, precision/unit/malformed input rejection, success replay after
subsequent stock changes, changed-key payload conflict, source-event duplicate rollback, concurrent
same-key retries across two APIs (including UUID case normalization), overselling, release/ship
races, terminal state rejection, tenant/reader rejection, tenant-scoped key reuse, RLS, bounded
stock/resource cursor pages, mismatch detection, ledger/result immutability and audit failure
rollback during both receipt and shipment, and rollback by a caller of the published transaction participant. Only successful results persist; an insufficient-stock
request can succeed with its original key after a receipt.

The two new frontend tests prove identical request/key retry after an unconfirmed write, disabled
pending edits, no optimistic stock, failed refresh hiding balances and disconnect clearing inventory.
CI remains configured but has not executed remotely. Fixtures use uniquely named disposable PostGIS
containers with no existing volumes; files run sequentially because synthetic trigger/drift probes
change their test schema. No main operational tenants or stock fixtures were seeded.

## Real browser evidence

Used the agent-browser skill and disposable pnpm test:browser fixture. Created a synthetic SKU,
received 10 each, reserved/consumed 4 (on-hand 6, reserved 0), reserved/released 2 (on-hand stays 6),
rejected a 7-unit reserve, then attempted a 1-unit receipt during forced persistence unavailability.
Refresh hid stock/history; restoring persistence and retrying the retained command produced exactly
one 1-unit movement, with final on-hand/available 7 and reserved 0. Reconciliation reported consistent.
No browser JavaScript errors were recorded. The full-page screenshot was visually inspected.

Ignored screenshots: parent runtime/ops02-complete.png and runtime/ops02-outage.png. Temporary QA
API/web/database services were stopped and the ignored credential artifact removed. Browser ref
clicks required scrolling controls into view; that automation issue was resolved before assessing
application behavior. Browser evidence predates only small header/label wording changes and the
final composite reservation-to-stock FK; final build/tests verify those changes.

## Contended stock baseline

Measured at 2026-10-08T18:35:24.884Z. Windows/Node v24.14.0, Intel i7-13650HX, 20 logical CPUs,
31.7 GB memory, disposable Docker PostGIS 18/3.6. Two API instances each have an 8-connection
pool. A fresh stock key per phase begins with 50 each. Eighty distinct reservations compete
for those units, then 50 shipments plus 10 identical shipment retries execute. A second tenant's
5-unit balance remains unchanged. Each phase produces 51 movements (one receipt and 50 shipments),
zero final on-hand/reserved and consistent reconciliation. Ninety 409 shortage responses are
expected business rejections across the run, not unexpected failures.

| Concurrency | Reserved | Expected shortages | Reserve p50 ms | p95 ms | p99 ms | Reserve requests/sec |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 50 | 30 | 16.25 | 19.42 | 29.85 | 64.49 |
| 8 | 50 | 30 | 49.41 | 61.23 | 87.87 | 180.78 |
| 32 | 50 | 30 | 162.69 | 253.95 | 301.39 | 179.01 |

The raw ignored artifact is runtime/inventory-load.json, generated by scripts/Inventory-Load.cjs.
Percentiles cover the 80 reservation requests per phase, including expected shortages; shipment
retries are correctness-checked but have no separate latency distribution. Setup/provisioning and
reconciliation requests are outside the 420 measured reserve/ship/replay requests.

Concurrency 32 increases latency without increasing throughput over concurrency 8. Stock-key
serialization and shared database work remain relevant; the short run does not isolate their
individual cost. Preserve lock correctness, budget all instance connections, and measure query/
readiness overhead and representative ledger volume before tuning. No production SLO, maximum
tenant count or durable-deployment capacity is established.

## Limits and next task

OPS-03 next introduces demand/fulfillment/shipment workflow entities and allowed/forbidden
transitions. This slice consumes whole reservations; partial shipment, transfers, adjustments,
expiry, conversions and repair workflows require explicit conservation policy and tests.
Reconciliation reports drift without repairing it. History UUID ordering is stable but not
chronological or an immutable snapshot. Pending command UI state is in memory while mounted;
durable recovery UX remains pending. OIDC, runtime/migration role separation, deployment controls,
backup/restore evidence, worker/outbox and planning snapshot integration remain future gates.
