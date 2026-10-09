# ARCH-01 — local verification evidence

Verified: 2026-10-09 (Asia/Bangkok). This closes the architecture-alignment slice before OPS-02.
Changes are local; no remote repository, publication or deployment was performed.

## Implemented behavior

- Nest uses its pinned Fastify adapter. Guards, strict request validation, genuine health/
  failure statuses, no-store headers and generated correlation IDs execute through real HTTP.
- Backend-only packages/operations owns identity, facilities, catalog and audit use cases,
  pure domain rules and module-owned PostgreSQL adapters. Thin API feature modules compose
  them. A transaction-bound query port keeps business changes and audit on one client.
- Nest request/response DTO metadata generates packages/contracts/openapi/v1.json and generated
  HTTP wire types. The browser client derives endpoint/method/body/result types from them.
  Generation is deterministic; verify checks freshness before rebuilding generated output.
  Types do not validate server responses in the browser at runtime; server DTO/domain checks
  remain the runtime authority. Serialized job/export schemas are future work.
- The web application has lazy facility/catalog routes, separate feature views, React Router
  and TanStack Query. Credentials remain in memory. Session changes abort requests, clear
  caches and prevent late authentication responses from restoring a disconnected identity.
  Query keys contain tenant/session identity, never credentials. Commands have no automatic
  retries or optimistic stock/master-data authority. Failed reads hide stale rows.
- Facility/SKU lists use indexed code/id ordering, a default of 50 and a maximum of 200.
  Cursors carry version, tenant and resource scope; malformed/foreign cursors reject.
  Each SQL query also filters the authorized tenant and uses forced row policies.
- AST import checks and package exports enforce browser/backend, application/package and
  domain/adapter directions and private peer-module restrictions for current source imports.
  These are development checks, not an adversarial runtime security boundary.
- Request metrics use route templates, with cumulative transaction/pool/query timings and
  safe structured server-error logs. Metrics retain no credentials, SQL parameters or tenant
  identifiers. DB_POOL_MAX is configurable (1–100; default 8). A telemetry export backend
  and OpenTelemetry traces remain future deployment work.

## Checks executed

| Check | Observed result |
|---|---|
| pnpm install --frozen-lockfile | Passed |
| pnpm verify | Passed: builds/typechecks, generated-contract freshness, import gate, 2 boundary tests and 6 frontend tests |
| pnpm test:integration | Passed: 12 configuration/HTTP/PostGIS tests using a disposable loopback container and non-superuser role |
| pnpm test:load | Passed: 900 measured requests, no status or tenant-scope errors |
| Parent scripts/Validate.ps1 | Passed: scripts, registry, Compose, secrets, ports, networks and Git boundaries |
| Main database read-only readiness probe | Ready: actual database/PostGIS, migration checksums and restricted role |

The integration suite preserves the ten OPS-01 checks for authentication/roles, tenant
isolation, concurrent reads, forced policies, provisioning, audit rollback, migration drift
and database loss. New cases verify pagination across 425 facilities, bounds/duplicate query
inputs, foreign tenant/resource cursors, SKU pages, safe headers, malformed/oversized bodies,
OpenAPI response/error schemas and HTTP instrumentation. Migration 001 was not changed.

Frontend tests exercise late authentication, disconnect cancellation, rejected credentials,
secret-free query keys, paginated navigation, failed refresh and failed writes. CI is configured
in .github/workflows/verify.yml; it has not executed remotely.

## Real browser QA

The agent-browser skill was used against pnpm test:browser's disposable two-tenant fixture,
not the main database. Verified facility creation, next/previous pages, SKU precision rejection
and successful creation, invalid credentials, tenant switching, outage refresh clearing stale
rows, rejected unavailable writes and recovery with no failed-write record. API-client ES module
exports were corrected after Vite revealed a development loading failure.

The harness accepts offline/online/quit to change only its disposable migration checksum.
It removes its ignored credential artifact and stops its API/web processes on exit; the wrapper
stops only its uniquely named disposable database. Final inspection found no test containers or
browser-qa credential artifact. Browser screenshots live in ignored parent runtime/.

## Local load baseline

Measured at 2026-10-09 00:49 Asia/Bangkok (2026-10-08T17:49:45Z). Windows, Node v24.14.0,
Intel Core i7-13650HX (20 logical CPUs), 31.7 GB RAM; disposable Docker PostGIS 18/3.6,
one API instance and pool maximum 8. Two tenants began with 1,000 facilities each. Each
concurrency step ran 300 requests: 90% 50-record reads and 10% facility creations, alternating
actors for reads and targeting tenant A for writes. Warm-up requests precede measurement.

| Concurrency | Requests | Errors | p50 ms | p95 ms | p99 ms | Requests/sec |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 300 | 0 | 7.56 | 9.45 | 18.22 | 126.15 |
| 8 | 300 | 0 | 15.73 | 25.69 | 38.27 | 464.45 |
| 32 | 300 | 0 | 61.55 | 91.61 | 94.50 | 486.34 |

The raw ignored artifact is runtime/architecture-load.json. The run recorded event-loop p95
11.4 ms, cumulative business-transaction pool waits 3,536 ms and query time 2,409 ms.
Transaction/query counters include fixtures and warm-up; timings do not cover all readiness/
authorization pool queries and must not be interpreted as a complete SQL breakdown.

Throughput increases little from concurrency 8 to 32 while latency rises. This is evidence to
budget database connections and measure saturation, not evidence that more instances will
increase capacity. Each authenticated request currently performs full readiness/checksum
verification as well as authorization; its overhead is a candidate for separate measurement.
No single bottleneck has been causally isolated by this baseline. No production SLO, tenant
capacity or framework speed ranking is established. OPS-02 must add a representative hot-stock
workload with concurrent idempotency, reconciliation and rollback correctness checks.

## Remaining gates

Inventory/receiving/reservations, fulfillment, durable workers/outbox, Redis, object storage,
snapshots and planning integration are not implemented by this slice. Pilot use still needs
OIDC/identity lifecycle, a separate least-privilege runtime role, deployment controls,
backup/restore evidence and agreed workload SLOs. The migration-owning local role remains
non-superuser but can change its own policies; local RLS tests do not establish pilot security.
