# DATA-01 — bounded, tenant-scoped CSV exchange

Integrations owns external source mappings and durable exchange receipts. It uses the owning
facilities/catalog/inventory modules' published read interfaces. Incoming stock observations
are staged external data: validation never creates stock movements, reservations, demand,
shipments or actual delivery. No external URLs/connectors or upstream write path exist here.

## Import contract

`POST /api/v1/integrations/imports` requires an operator credential, `schemaVersion: 1`,
`idempotencyKey` UUID, `sourceSystem`, distinct event `externalId`, `fileName` and `csv` text.
CSV has exactly these headers (header ordering may differ):

```csv
record_id,facility_ref,sku_ref,unit,on_hand,reserved,observed_at
observation-1,warehouse-A,article-A,each,10,2,2026-01-01T00:00:00Z
```

The parser supports quoted commas/newlines, escaped quotes, CRLF/LF and an optional BOM.
It rejects null characters, malformed quotes, fields over 1024 characters, excessive columns
and over 200 data records. The CSV request is capped at 40000 characters; the whole encoded
HTTP body remains capped at 64 KiB. The UI additionally limits uploaded files to 40000 bytes.
These are explicit synchronous limits; increasing them requires the accepted durable worker,
BullMQ/dedicated Redis/outbox design and recovery evidence, rather than larger API loops.

`POST mappings` binds a tenant/source/entity/external reference to a validated facility or SKU
in the same tenant. Input includes the command's event identity, `entity: facility|sku`,
`sourceExternalId` and `targetId`. Mappings are immutable; replacing/removing them requires a
future versioned policy. External references are case sensitive. Sources are never inferred
from a similar code or a foreign tenant's record.

Validation checks:

- Exact schema and column counts; required bounded record/facility/SKU source identities.
- Both mappings exist in the authenticated tenant and the file's source system.
- Explicit supported unit matches the mapped SKU, without implicit conversion.
- Nonnegative bounded decimal-string on-hand/reserved quantities fit SKU precision;
  reserved cannot exceed on-hand. Integer atoms yield exact available quantity.
- Valid UTC calendar `observed_at`, no more than five minutes ahead of validation time.
  Historical observations are allowed. This validates a supplied observation's structure,
  not an upstream enterprise system's authenticity.
- Unique source record IDs within the file and across earlier validated imports.
  A file has one observation per mapped facility/SKU, including aliases of the same target.

Any issue rejects the entire file: `acceptedRows=0` and no staged records or source identity
registrations. A persisted `rejected` report is a successful validation command, not accepted
data. It includes logical CSV record numbers (header is 1), fields, error codes and messages.
Successful files persist normalized rows with source references, mapped IDs, exact units,
precision, quantities and observed timestamps. Registrations serialize by tenant/source
across API instances; a concurrently repeated observation can be accepted only once.

## Export contract

`POST /api/v1/integrations/exports` is available to operators and readers. A server-owned
read-operation annotation permits this specific POST to record extraction/audit receipts;
other business POST commands still require operators. Export includes normal event identity
and one resource:

| Resource | Scope | Contents |
|---|---|---|
| facilities | Tenant-scoped cursor page, default 50, max 200 | IDs, codes/names, type, IANA zone, WGS84 degrees, location/source provenance |
| skus | Tenant-scoped cursor page, default 50, max 200 | IDs, codes/names, explicit units/precision and source identity |
| stock | Required facilityId and skuId, one key | IDs, explicit units/precision and current on-hand/reserved/available decimal strings |

Master cursors bind tenant/resource. Each page is a separate extraction receipt; changing
live data between pages means a collection of pages is not a point-in-time snapshot.
Stock reads a single consistent balance projection. Current availability is not a future
fulfillment promise. No operational tables are written by export; only receipt/audit metadata.

CSV fields are structurally quoted. Potential spreadsheet formulas in textual values receive
an apostrophe prefix. `spreadsheetSafe=true` declares that representation; consumers must
not treat sanitized textual values as canonical source IDs without interpreting the format.
Quantity strings preserve exact decimal digits in the artifact; spreadsheet software may
infer numeric types when opening it. Download uses the receipt's exact UTF-8 bytes, so the
reported SHA-256 matches the file without an extra browser-inserted BOM.

## Receipts, lineage and access

Mapping/import/export commands use tenant-scoped retry keys, normalized fingerprints and
unique source events per action. Changing payload under a completed key rejects. Replaying
the same request returns its original result, including historical quality findings/export
bytes, even after stock or mappings change. Corrected files or revalidation after adding a
mapping need a new event reference and key. Rejected quality reports are retained.

Receipt, source registrations, command result and audit commit in one unit of work. Failure
rolls them all back. Records include tenant, actor, source/event identity, generation time,
schema version and content SHA-256. Import hashes cover original input UTF-8 CSV; raw input
is not retained, while normalized accepted observations are. Export hashes cover returned CSV.

`GET mappings` and `GET documents` are bounded paged registers; `GET document?id` fetches a
tenant-authorized stored report/export. Forced row policies, tenant foreign keys and immutable
histories supplement authorization. New integration tables revoke the bootstrap
`snapshot_reader` default grants: unapproved uploaded observations and command receipts are
not part of its approved planning extraction surface.

The initial bounded artifact adapter is the owning PostgreSQL receipt repository; APIs have
no local durable file dependency. Bulk object artifacts/S3, manifest versions, approval,
retention and separately scoped artifact access belong to DATA-02 and durable jobs. Every
DATA-01 receipt has `planningApproved=false`; a content hash and an append-only receipt do
not establish the approved immutable planning-snapshot gate. No simulation worker receives
an operational credential or a connector to this application.

## Operator UI and remaining limits

The lazy Data exchange route supports mapping, upload/paste/template validation, paged
registers, field-level reports, scoped export and download. It never shows recorded rejection
as accepted rows. Session/tenant caches are isolated; failed refresh hides stale reports.
Unconfirmed requests retain their exact bytes/key while the route remains mounted. Automatic
write retries are disabled; competing controls stay disabled until recovery or explicit
rejection editing. Reloading/leaving loses in-memory pending requests; durable operator
recovery remains future work. Uploaded files and credentials stay out of browser storage.

This slice accepts stock-observation CSV only. General ERP schemas, column mapping profiles,
demand/fleet ingestion, source mapping revisions, bulk jobs, approved manifests, external
delivery integrations and production identity/recovery/retention controls remain pending.

# DATA-02 — approved immutable planning snapshots and versioned manifests

DATA-02 provides point-in-time extraction of operational truth into approved, immutable planning
snapshots. Snapshots are decoupled from operational writes, enforcing read-only boundary
separation between core operations and downstream simulation/planning systems (e.g. `logistics-sandbox`).

## Snapshot extraction contract

`POST /api/v1/integrations/snapshots` requires an operator credential, `schemaVersion: 1`,
`idempotencyKey` UUID, `sourceSystem`, distinct `externalId`, and optional `notes`.

The extraction transaction captures a consistent point-in-time state of:
- `facilities.csv`: Facilities, coordinates, timezones, types and location provenance.
- `skus.csv`: Catalog SKUs, explicit units, quantity precisions and source identity.
- `stock.csv`: Inventory balances (on-hand, reserved, available) formatted as exact decimal strings.
- `orders.csv`: Orders, demand lines, order status, requested/allocated/shipped quantities and timestamps.
- `manifest.json`: Root cryptographic manifest linking all individual artifacts and approval metadata.

No operational rows (`sc_facilities`, `sc_skus`, `sc_inventory_balances`, `sc_inventory_movements`,
`sc_orders`, `sc_shipments`) are modified or deleted by snapshot extraction.

## Cryptographic integrity and immutability

- Each individual artifact is hashed with SHA-256 (`contentSha256`).
- Root content hash (`contentSha256`) is deterministically derived from sorted artifact hashes: `hash(sorted([name:contentSha256].join(';')))`.
- Manifest root fingerprint (`manifestSha256`) hashes the normalized manifest JSON structure.
- Storage in PostgreSQL is strictly append-only: `sc_planning_snapshots` and `sc_snapshot_artifacts`
  enforce trigger `history_guard` rejecting any `UPDATE`, `DELETE`, or `TRUNCATE` with an append-only error.
- All integration commands, snapshots, and audit events commit together in a single transaction;
  audit trigger failure rolls back all generated artifacts and commands cleanly.

## Scoped planning access

Downstream planning systems and readers query approved snapshots via dedicated endpoints:
- `GET /api/v1/integrations/snapshots`: Paged list of approved snapshot summaries with cursors.
- `GET /api/v1/integrations/snapshot?id=<uuid>`: Complete snapshot manifest with approval metadata and artifact digests.
- `GET /api/v1/integrations/snapshot/artifact?id=<uuid>&name=<name>`: Download individual artifact content and SHA-256.

All snapshot read operations are tenant-isolated and available to operator and reader roles.
At the database layer, the `snapshot_reader` role is granted `SELECT` on `sc_planning_snapshots`
and `sc_snapshot_artifacts` with forced row-level security (`FORCE ROW LEVEL SECURITY`), with all write
operations strictly prohibited.

