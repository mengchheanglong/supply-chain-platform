# Operational API

NestJS 11 with its compatible Fastify adapter. Feature modules compose the backend-only
operations package. Controllers validate DTOs, obtain an authenticated tenant actor and
call use cases; repositories own SQL and audits share the same transaction.

GET/POST /api/v1/facilities and /api/v1/skus retain their v1 envelopes. Lists default to
50 records, accept limit 1..200 and a tenant/resource-scoped cursor, and return nextCursor.
Unknown body fields reject. Health endpoints expose real readiness/liveness; all responses
use no-store and a generated X-Request-Id. Logs omit raw exceptions, SQL, tokens and payloads.

Build from the repository root. The dev command runs compiled output; rebuild/restart after
backend changes. pnpm verify checks generated OpenAPI/client, import boundaries and UI tests;
pnpm test:integration uses disposable PostGIS for real HTTP/transaction/tenant regressions.
Migration/config compatibility entry points support existing CLI/test callers.

Inventory endpoints under /api/v1/inventory provide receive/reserve/release/ship commands,
balance/history queries and reconciliation. Quantity strings, tenant-safe references and
source/idempotency identities are mandatory. See ../../docs/INVENTORY.md for the command policy.
Successful retries return the original receipt; failed transactions never report success.
