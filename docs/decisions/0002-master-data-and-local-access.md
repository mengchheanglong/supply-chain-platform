# ADR-0002 — Master data and scoped local access

Date: 2026-10-08. Status: Implemented locally in OPS-01.

Use native pg with parameterized queries and app-owned SQL migrations. A session advisory
lock serializes migrations, each file runs in a transaction, and SHA-256 checksums detect
drift. operations_app owns sc_-prefixed public tables; no superuser/bypass-RLS API credential
is accepted. Public namespace reuses the parent's existing app-owner grants.

First records are facilities and SKUs with tenant-scoped codes and external identities.
Coordinates are WGS84 degrees with surveyed/imported/estimated provenance. SKU unit and
precision are mandatory. No overloaded stock field or marketplace/cart schema is copied.

Bootstrap an organization and opaque 256-bit scoped operator key through the local CLI.
Only the hash is stored in PostgreSQL; the one-time credential artifact is ignored.
API authorization derives tenant/role server-side. Reader keys cannot create records;
revoked keys reject. UI storage is memory-only. This provides local API authorization,
not OIDC, identity federation, credential lifecycle management or production deployment.

Facilities, SKUs and audits use FORCE ROW LEVEL SECURITY. Each pooled transaction sets
its tenant context locally, so it disappears on completion. Domain creation and audit
insertion are atomic; normal audit UPDATE/DELETE reject. Migration-owning database
credentials remain privileged and must not reach clients or simulation workers.

Snapshots, user administration, cursor pagination, updates, inventory and full fulfillment
are subsequent slices. No sample operational tenants/data are automatically seeded.
