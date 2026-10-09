# DATA-01 — local verification (2026-10-09)

Implemented the integrations module, tenant/source mappings, bounded stock-observation CSV
staging, quality reports and authorized operational CSV exports. See [the contract and limits](DATA_EXCHANGE.md).
Inputs never change operational stock, reservations, orders or shipments. Every receipt has
`planningApproved=false`; DATA-02 remains a separate approval/immutable-snapshot gate.

## Automated evidence

`pnpm test:integration` passes 36 real API/PostGIS/config tests, including seven new exchange
scenarios and the previous foundation, inventory and fulfillment regressions. Two API instances
share the disposable database. Exchange coverage includes:

- CSV BOM, quoting, CRLF, malformed grammar and bounds; missing units, mismatched units,
  precision, conservation, missing mappings, duplicate observations, invalid/future UTC dates.
- Exact normalized quantities, tenant/source lineage and original input SHA-256. Rejected
  files retain quality reports with zero accepted records and no identity registrations.
- Concurrent key retries, cross-file source IDs and racing imports; only one repeated
  observation is accepted. Changed payloads reject; completed retries return original results.
- Reader export permission, operator-only staging/mapping, tenant and cursor isolation,
  forced row policies and immutable histories. Exports preserve exact CSV hashes and
  original bytes on retry after live stock changes. Spreadsheet formula text is sanitized.
- Late audit failure rolls back document, identity registrations and command receipt together;
  a subsequent retry can succeed. Before/after operational projections remain unchanged.

`pnpm verify` passes generated OpenAPI/type checks, module import gates, all builds,
14 frontend tests and two boundary tests: 52 tests in total with integration coverage above.
Three exchange frontend tests cover quality states, unconfirmed retries/control locking,
failed refresh and reader/session boundaries. Frozen-lockfile installation also passes.

## Browser and local database evidence

Agent-browser exercised the real API and Vite UI against a disposable synthetic PostGIS
database. It created a SKU, rejected an unmapped template, added facility/SKU mappings,
then validated the same CSV under a new event. The accepted observation showed on-hand 10,
reserved 2 and available 8. A selected operational stock export still contained 0/0/0.
The facility export contained a bounded 50-row page and offered its next cursor.

Disabling migration readiness produced an unconfirmed export with competing controls locked;
restoring readiness and retrying the preserved request recorded one export receipt. Failed
queries hid previous receipt/register data. Browser JavaScript error inspection was empty.
The rendered receipt/download view was visually inspected.

The native CLI download command reported cancellation on Windows. Configuring Chrome's
download directory through its existing CDP session and clicking the same UI button completed
the actual 238-byte `stock.csv` download. Its SHA-256 matched the displayed receipt:
`4b0e0e022cbb58def6d8adde56fbfeb235fba509e28ab5f6c7e5bde182ff8237`.
Download links are attached while clicking and Blob URL cleanup is delayed. QA files are
ignored runtime artifacts. Temporary browser/API/web/database resources were stopped afterward.

Migration 004 applied to local main and a repeat migration verified all checksums. Migrations
001–003 are unchanged. A read-only local probe returned all four readiness checks true;
all four integrations tables had row security enabled and forced, and `snapshot_reader`
had no SELECT permission on any of them. No browser fixtures were written into main.
Workspace `scripts/Validate.ps1` passes; the retired e-commerce checkout remains clean.

## Limits and next handoff

This is a local bounded synchronous slice (200 observations, 40000 CSV characters, 64 KiB
whole request). It is not a bulk-throughput or production-capacity claim. PostgreSQL stores
the owning module's immutable receipts; raw imported CSV is not retained. No durable worker,
queue, outbox, S3 artifact service, external connector or upstream write-back was introduced.
Multiple live export pages do not form a consistent dataset snapshot.

Next is DATA-02: approved tenant-scoped immutable snapshots, versioned hashed manifests and
separately scoped artifact access/retrieval. Simulator determinism, strict routing and deployment
egress gates remain independent prerequisites. Pilot identity, recovery and retention controls,
general ERP/demand/fleet schemas and durable operator recovery remain pending.

# DATA-02 — local verification (2026-10-09)

Implemented approved tenant-scoped immutable planning snapshots, versioned hashed manifests,
trigger-enforced append-only artifact storage, and scoped planning access.

## Automated evidence

- `pnpm test:integration` executed **43 tests** across 6 test suites against an isolated,
  disposable loopback PostGIS container (`postgis/postgis:18-3.6`) with zero failures:
  - `apps/api/tests/config.test.cjs`: Configuration and secret exposure tests.
  - `apps/api/tests/master-data.integration.test.cjs`: Identity and master data tests.
  - `apps/api/tests/inventory.integration.test.cjs`: Inventory ledger, reservations, and idempotency tests.
  - `apps/api/tests/fulfillment.integration.test.cjs`: Orders, allocations, picking, packing, and shipment tests.
  - `apps/api/tests/exchange.integration.test.cjs`: CSV exchange, mapping, and export tests.
  - `apps/api/tests/snapshot.integration.test.cjs` (new in DATA-02):
    1. Operator requirement: operator generates approved snapshot; reader is rejected with 403 Forbidden.
    2. Point-in-time extraction: facilities, SKUs, inventory balances, and order demand captured into discrete CSV artifacts.
    3. Cryptographic integrity: SHA-256 computed for each artifact (`contentSha256`), root `contentSha256` computed from sorted artifact hashes, and `manifestSha256` hashing the normalized manifest JSON.
    4. Zero operational mutation: table counts for movements, reservations, orders, lines, shipments, facilities, and SKUs are unchanged; inventory balances and reconciliation remain untouched.
    5. Replay stability and conflict rejection: identical commands replay original manifest (201); conflicting payloads under the same key reject with 409 Conflict.
    6. Tenant isolation: tenant B cannot read tenant A's snapshots or artifacts (404); reader in tenant A can read and list approved snapshots.
    7. Database immutability guard: direct SQL `UPDATE` and `DELETE` on `sc_planning_snapshots` and `sc_snapshot_artifacts` reject with `/append-only/` via `history_guard` trigger.
    8. Late audit failure rollback: injected audit failure triggers complete transactional rollback of snapshots, artifacts, and command receipts.
    9. Database `snapshot_reader` grant: client session with `snapshot_reader` role can `SELECT` with forced RLS, but direct `INSERT`, `UPDATE`, and `DELETE` are rejected with `permission denied`.

- `pnpm verify` passes:
  - Generated OpenAPI v1 specification check (`contracts:check`)
  - Boundary enforcement (`check:boundaries` and AST import tests)
  - Full TypeScript build across all packages and apps
  - 15 frontend tests in `@supply-chain/web` (including snapshot generation, manifest rendering, and artifact download tests)

## Migration 005 and database schema

- Migration `005_planning_snapshots.sql` adds `sc_planning_snapshots` and `sc_snapshot_artifacts` with unique constraints, foreign keys, and forced row-level security.
- Append-only trigger `history_guard` prevents updates or deletions.
- Role `snapshot_reader` is granted `SELECT` on both snapshot tables.

