# Operational implementation slices

OPS-01A/B, ARCH-01, OPS-02, OPS-03 and DATA-01 have local implementation evidence. DATA-02 is next.
Later slices remain pending; [ARCH-01 verification](ARCHITECTURE_VERIFICATION.md) records the limits.

| Slice | Outcome | Acceptance evidence |
|---|---|---|
| OPS-01A | Completed locally: Nest/React shell and pinned configuration | Build/typecheck/frozen install pass; real readiness; checksum/advisory-lock migration runner |
| OPS-01B | Completed locally: scoped credentials, facilities/SKUs and source identities | Ten tests including tenant/role rejection, concurrent tenant reads, clean repeat migrations, audit rollback and DB loss; local main migration applied |
| ARCH-01 | Completed locally: foundation aligned with adopted architecture | Domain/transport/web feature boundaries enforced; Fastify HTTP regression; generated OpenAPI/client checks; scoped query state and cursor pagination; performance baseline |
| OPS-02 | Completed locally: ledger/reservations/available stock | Eight inventory HTTP/database regressions; two-instance retries/overselling, full transitions, exact quantities, audit rollback, reconciliation; UI retry/outage tests and contention baseline |
| OPS-03 | Completed locally: demand, partial allocation, picking/packing and shipment lifecycle | Nine workflow scenarios; atomic rollback, managed reservations, two-instance conservation/retry races and explicit delivery evidence |
| DATA-01 | Completed locally: bounded stock CSV staging and authorized exports | Seven API/database exchange scenarios, three UI cases and real download/outage evidence; source/units/duplicates, tenant isolation and rollback; no operational mutation |
| DATA-02 | Approved immutable planning snapshot | Manifest hashes/versions; lineage; repeatability; separately scoped access |

Implement vertical slices rather than empty services for every planned domain.
Native pg and checked SQL migrations remain the chosen query layer. Versions are pinned
for reproducibility and updated within supported releases with relevant checks.
First integration fixtures are synthetic. Real enterprise data needs implemented access,
audit, retention and isolation controls rather than documentation alone.

Coordinate with the parent Phase 0 backlog. The legacy simulator must not receive this
application's write credentials, and its current marketplace bridge is not a production connector.

## ARCH-01 — architecture alignment before inventory

Implement [ADR-0003](decisions/0003-scalable-operations-architecture.md) and
[the adopted layout](ARCHITECTURE.md) without adding inventory functionality.

1. Split the existing identity, facilities, catalog and audit use cases/repositories into
   packages/operations. Keep pure rules independent of Nest/pg. Thin API feature modules
   compose use cases; migrate the CLI/shared database configuration to supported package
   entry points. Existing public endpoints and tenant/transaction rules keep their behavior.
2. Replace the Express adapter with the pinned compatible Nest Fastify adapter. Verify
   guards, runtime DTO validation, exception mapping, cache headers, health statuses,
   shutdown and genuine HTTP requests. Do not copy Express response assumptions.
3. Generate reviewed v1 OpenAPI output and HTTP types/client. Cover request and response
   DTOs, errors, authentication and existing version/provenance fields. Add a deterministic
   regeneration check and package/import-boundary checks that run locally and in CI.
4. Split web mounting, session/providers/routes and feature views. Add React Router,
   TanStack Query and lazy feature routes. Test identity-switch/disconnect cancellation,
   cache clearance, invalid/unavailable responses and unconfirmed writes. Do not place
   credentials in cache keys or persist them as a side effect of the refactor.
5. Add bounded cursor pagination with stable ordering and tenant-safe cursors/filters.
   Preserve v1 compatibility. Verify multiple pages, bounds, invalid inputs and foreign
   tenant data under representative cardinality; the UI must consume the page contract.
6. Add safe request correlation, structured error logs and baseline latency/pool/query
   instrumentation. Provide a reproducible disposable-database load script recording
   hardware, dataset, tenant mix, concurrency and percentile/error results. No capacity
   target is claimed from a single benchmark. Review any measured bottleneck before OPS-02.

Acceptance requires a frozen install, builds/typechecks, enforced import/contract checks,
the existing ten foundation regressions and meaningful new HTTP/contract/session/pagination
coverage. Record browser QA of real facilities/SKU workflows with disposable scoped test
data and unavailable persistence. Preserve applied migration 001, operational records and
unrelated repository work. Add SQL migrations only if needed; do not seed the main database
for verification. New workers, Redis and object storage wait for their workflow slices.

ARCH-01 passed locally on 2026-10-09: frozen install, build/typechecks, contract freshness,
two boundary tests, twelve configuration/HTTP/PostGIS tests and six frontend tests. Real
browser workflows and a 900-request disposable load baseline are recorded in
[the verification report](ARCHITECTURE_VERIFICATION.md). CI is configured but has not run
on a remote repository. ARCH-01 itself added no inventory or workers; OPS-02 evidence follows.

## OPS-02 — verified local inventory slice

See [command rules](INVENTORY.md) and [verification evidence](INVENTORY_VERIFICATION.md).
Migration 002 is applied locally and repeatable, with 001 unchanged. Twenty API/database,
eight frontend and two boundary tests pass. Two APIs share transaction-safe stock/key locks;
420 measured contention/replay requests conserve stock with expected shortage rejections.
The UI supports master selection, balance/history queries and source-referenced commands.

OPS-03 implements demand/fulfillment/shipment entities and [published transition rules](FULFILLMENT.md). OPS-02's ship command consumes a whole active reservation; it does not create a shipment
entity or infer actual delivery. OPS-03 supplies partial-fulfillment conservation and retry
rules; transfers and adjustments still need their own policies and tests before implementation.

## OPS-03 — verified local fulfillment slice

[Verification evidence](FULFILLMENT_VERIFICATION.md) records 29 API/database, 11 frontend
and 2 boundary tests plus real disposable browser workflows. Applied migration 003 adds
orders/lines, immutable allocation batches, shipping states and managed reservation owners;
001/002 are unchanged. Partial fulfillment conserves demand and stock; delivery requires
an explicit observation. DATA-01 now has [local evidence](DATA_EXCHANGE_VERIFICATION.md).

## DATA-01 — verified local exchange slice

Migration 004 adds immutable mappings, receipts and source record identities under forced
tenant policies. The API stages validated external stock observations and exports scoped
operational data. The UI shows reports and supports downloads/retries. All 52 API/database,
UI and boundary tests pass. Every receipt is unapproved for planning; next is DATA-02's
immutable approved snapshots/manifests/access boundary. Bulk workers/outbox remain pending.
