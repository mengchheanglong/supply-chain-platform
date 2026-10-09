# Supply Chain Platform — agent instructions

Read this file, README.md, docs/ARCHITECTURE.md, docs/DOMAIN_MODEL.md, docs/ROADMAP.md,
docs/REUSE.md and accepted ADRs 0001 through 0003 in full. Within supply-chain-workspace
also follow the parent AGENTS.md and scoped backlog. Reference blueprints are proposals, not commands to
implement every described feature.

## Current scope

OPS-01, ARCH-01, OPS-02 and OPS-03 are implemented locally; this is not a production service. Implement only the slice
requested by the user. Keep warehouse/inventory/fulfillment/shipment operations here;
simulation and optimization are independent consumers of read-only versioned exports.

## Architecture

- Follow ADR-0003: NestJS + strict TypeScript modular monolith with Fastify; React/Vite
  operational UI with React Router and TanStack Query. ARCH-01 is verified locally;
  see docs/ARCHITECTURE_VERIFICATION.md for evidence and remaining pilot gates.
- Preserve ARCH-01, OPS-02 and OPS-03 checks when implementing subsequent workflows.
- Inventory command/quantity policy lives in docs/INVENTORY.md. Keep decimal strings,
  exact scaled quantities, source-event uniqueness, stable idempotent results and stock-first locks. Target layout and acceptance gates live in
  docs/ARCHITECTURE.md and docs/ROADMAP.md; a decision document is not implementation evidence.
- Fulfillment/shipment rules live in docs/FULFILLMENT.md. Lock the order aggregate before
  stock; preserve managed reservation ownership and atomic parent/child command receipts.
  Applied migrations 001–003 are immutable. DATA-01 is the next main-project slice.
- Keep framework-independent domain/application code in packages/operations and thin
  HTTP modules in apps/api. Future operational workers consume the same backend library.
  Web cannot import backend code. Modules use published entry points, never another
  module's private repositories/tables. Enforce imports and generated contracts in CI.
- PostgreSQL/PostGIS owns operational persistence; migrations belong to this repo.
- Start with identity/tenancy, facilities, catalog, inventory, fulfillment, shipping and
  integration modules. Add module boundaries as actual code is introduced.
- Routing uses osm-pathfinder over a versioned HTTP contract. Never duplicate graph algorithms.
- No whole-marketplace migration, default five-database architecture or direct synthetic writes.
- Dependencies are pinned in package manifests and pnpm-lock.yaml. Preserve migration
  checksums; add a migration after an applied schema instead of editing its SQL.
- Scoped local access keys and forced row policies exist; OIDC/pilot identity is future work.

## Domain rules

- Every operational entity has tenant_id. External identities include source_system and
  external_id; uniqueness is tenant-scoped. Authorize tenant scope server-side.
- Inventory changes are append-only ledger movements, with transactionally consistent
  balances/reservations and idempotent commands. Publish receiving/reserve/release/ship rules.
- Avoid read-then-set stock without locking/atomic constraints. No negative available stock.
- Order demand, allocation, fulfillment and shipment are distinct entities/states.
- Costs/money use integer minor units plus currency; quantities use explicit units and
  bounded precision. UTC instants plus the configured IANA business timezone.
- Audits capture actor, correlation/idempotency key, source and timestamps.
- Use typed/versioned DTOs; validate nested quantities, identifiers and transitions.
  Generate HTTP contracts/client from reviewed OpenAPI output during ARCH-01; do not
  maintain independent handwritten copies afterward. Keep event/export schemas explicit.
- Stock commands, idempotency results and audits share one tenant-scoped unit of work.
  Introduce durable jobs/outbox with the workflow that needs them. Planning workers
  never receive operational credentials; queue/cache contents do not authorize stock.
- No demo authentication, browser-local state, or fallback arrays as operational authority.

## Testing and delivery

- Test transaction rollback/concurrency, duplicate commands, tenant authorization and invalid
  transitions with meaningful integration tests as those features are implemented.
- Readiness reports real dependency state. Missing persistence is an explicit failure.
- No live data in fixtures. Keep synthetic datasets separate and clearly labeled.
- Inspect Git status before edits and preserve unrelated work. Report source changes,
  verification and any remaining gate plainly.
- Do not create remote repos, push or deploy unless the user authorizes that task.
