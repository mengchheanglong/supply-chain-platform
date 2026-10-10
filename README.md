# Supply Chain Operations Platform

The operational application for warehouses, inventory, order fulfillment and domestic
distribution. OPS-01 now implements the API/UI foundation, scoped access, facility and
SKU master data, PostgreSQL/PostGIS migrations and transactional creation audits.
OPS-02 adds receiving commands, an immutable movement ledger, balances and the
reserve/release/consume lifecycle. OPS-03 adds demand orders, partial allocation batches,
explicit picking/packing and shipment dispatch/observed delivery. DATA-01 adds source mappings,
bounded external stock CSV validation/staging and tenant-authorized operational CSV exports.

## Adopted architecture

The accepted design is a NestJS/TypeScript modular monolith with Fastify, PostgreSQL/PostGIS
and a React/Vite operations UI using React Router and TanStack Query. Domain/application
code belongs in a backend-only operations package; API and future operational workers
compose it. Versioned OpenAPI generates the HTTP client. Heavy jobs get a separate worker;
routing, simulation and optimization keep their independent service boundaries.

Read [the architecture and folder layout](docs/ARCHITECTURE.md) and
[ADR-0003](docs/decisions/0003-scalable-operations-architecture.md).
ARCH-01 is implemented and verified locally: Fastify, backend domain/application boundaries,
generated OpenAPI wire types with a typed client, lazy feature routes, scoped query state and
cursor pagination. See [verification evidence](docs/ARCHITECTURE_VERIFICATION.md).
OPS-02 inventory is implemented locally; see [inventory rules](docs/INVENTORY.md) and
[verification evidence](docs/INVENTORY_VERIFICATION.md). OPS-03 also passes locally; see
[workflow policy](docs/FULFILLMENT.md) and [verification](docs/FULFILLMENT_VERIFICATION.md).
DATA-01 passes locally; see [exchange rules](docs/DATA_EXCHANGE.md) and
[verification](docs/DATA_EXCHANGE_VERIFICATION.md). Imports leave actual stock unchanged.
Workers, queues, object storage and production capacity remain pending.

## Product boundary

Own operational facilities, SKUs, stock ledger/reservations, receiving, fulfillment and
shipments. Initial work is a small auditable operations platform. Procurement, supplier
management, manufacturing, global freight, billing and a complete ERP/WMS replacement
are later/out of scope. Enterprise readiness must be demonstrated by tests and pilot evidence.

Related independent services:

- osm-pathfinder — road costs and route geometry; never vehicle assignment or stock ownership.
- logistics-sandbox — experiments against copied data; never the operational source of truth.
- fleet-route-optimizer — VRPTW solver, constraint validator, financial cost-to-serve models, and scenario evaluation (OPT-01, EVAL-01).
- ecommerce-storefront — commercial customer storefront; orders automatically bridge into fulfillment and double-entry stock allocation via SupplyChainBridgeService.
- supply-chain-control-tower — standalone operations control tower and ecosystem mission control (port 3300).

## Implemented foundation

```text
apps/
  api/                 NestJS foundation, tenant authorization and master data
  web/                 React operations UI; facility/SKU forms and authorized lists
packages/
  operations/          Backend domain/application code and module-owned SQL adapters
  contracts/           Generated versioned OpenAPI specification and HTTP wire types
  api-client/          Browser-safe typed fetch client
database/
  migrations/          App-owned PostgreSQL/PostGIS migrations with checksum validation
docs/
  DOMAIN_MODEL.md      Domain language and invariants
  ROADMAP.md           First delivery slices and acceptance evidence
  REUSE.md             Selective reuse rules
  decisions/           Adopted foundation decisions
```

Node.js 24 and pnpm 10.32.1 are pinned. The parent supplies local PostGIS and credentials;
this application owns its migrations. API/UI development binds to loopback on 3100/3101.
No operational fixtures or default tenant credentials are seeded.

## Local startup

Start the parent's PostGIS service first, then run from this repository:

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env # first setup only; preserve an existing .env
pnpm build
pnpm migrate
pnpm tenant:create "Your organization" Asia/Phnom_Penh
pnpm dev:api
# In another terminal:
pnpm dev:web
```

Open http://127.0.0.1:3101. Tenant provisioning saves a generated operator credential
to an ignored .secrets/<tenant-id>.json file. Paste its token into the UI. The database
stores its SHA-256 hash; the UI keeps the token only in memory. This is genuine scoped
local access, not a demo identity switch. OIDC, user management, rotation/expiry and
deployment TLS are later pilot work. Use these local development endpoints accordingly.
Stop each foreground server with Ctrl+C. The API dev command runs built output;
rebuild/restart it after source changes. Vite updates frontend source during development.
After changing a shared package, rebuild it before refreshing the web application.

Configuration requires DATABASE_URL or DB_PASSWORD_FILE. The example password file
refers to the parent's ignored operations credential. Credentials never go to simulation.
Migrations require a non-superuser owner; the API refuses operational access if its role
can bypass row policies. Applied SQL is checksum-pinned; add migrations instead of editing it.

## API and evidence

- GET /api/health/live reports process liveness; /api/health/ready checks the actual
  database, PostGIS, migration checksums and restricted role, returning 503 if unready.
- GET /api/v1/context authenticates a bearer credential and derives its tenant/role.
- GET/POST /api/v1/facilities and /api/v1/skus list/create authorized master data.
  Reader credentials can list; operator credentials can create. Unknown request fields,
  invalid coordinates/timezones/units/precision and tenant identity injection reject.
- Facility/SKU codes and source identities are unique within a tenant. Facility positions
  use WGS84 degrees with explicit location provenance. SKU units and decimal precision
  are explicit; each requires precision zero. Inventory quantities use decimal strings
  and exact scaled integer arithmetic, with no implicit conversion.
- Create commands and append-only audit insertions share a transaction. Concurrent
  requests use transaction-local tenant context and forced row-level policies.

Run pnpm verify for builds/typechecks, contract freshness, two boundary tests and eleven
frontend tests. pnpm test:integration runs twenty-nine configuration/HTTP/PostGIS tests in a
disposable loopback-only container with a non-superuser role and no existing volumes.
They cover scoped credentials, concurrent tenant reads, validation, migration drift,
provisioning, row policies, audit rollback, database loss, pagination and Fastify contracts.
Lists default to 50 records and accept limit 1–200 with a tenant/resource-scoped cursor.
pnpm test:load records a disposable-database baseline; pnpm test:browser starts a disposable
fixture for manual browser QA. pnpm test:inventory-load measures competing reservations
and shipment retries across two APIs using disposable stock. Master-data updates remain future work.

Inventory offers POST receive/reserve/release/ship and GET balance/reservations/movements/
reconciliation under /api/v1/inventory. Select a facility and SKU in the Inventory UI.
Readers can query; operators supply source references and issue commands. Active reservations
are released or consumed in full. Unconfirmed commands retain their exact request/key for
explicit retry while the page stays mounted. Read [the command policy](docs/INVENTORY.md).

The Fulfillment & shipping UI supports demand drafts, partial stock allocation and explicit
transitions. Workflow-owned reservations must be released/consumed through their workflow.
See [the workflow API and transition policy](docs/FULFILLMENT.md).

## First implementation

1. API/UI shell, configuration validation, readiness and tenant context.
2. Facility and SKU records with tenant-safe external identities and migrations.
3. ARCH-01: completed locally; preserve its architecture and regression checks.
4. OPS-02: completed locally; transactional inventory ledger and idempotent reservations.
5. OPS-03: completed locally; partial fulfillment, picking/packing and observed shipment states.
6. DATA-01: completed locally; bounded CSV staging, quality reports and authorized exports.
7. DATA-02: completed locally; approved tenant-scoped immutable snapshots and hashed artifact manifests.
8. PILOT-01: completed locally; enterprise OIDC/JWT, RBAC, tamper-evident audit logs, and backup verification.

Read [AGENTS.md](AGENTS.md), [domain model](docs/DOMAIN_MODEL.md),
[roadmap](docs/ROADMAP.md), [reuse decision](docs/REUSE.md) and
[accepted ADRs](docs/decisions/0003-scalable-operations-architecture.md) before implementation.
In the full workspace, also read ../AGENTS.md and ../docs/BACKLOG.md.

This is a separate local Git repository. No GitHub remote or published repository has
been created by setup. Do not import secrets, generated dependencies or parent runtime data.
