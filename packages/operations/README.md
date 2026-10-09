# Operational application library

Backend-only strict TypeScript. Modules own domain rules, use cases, repository ports and
PostgreSQL adapters. Nest composes these through the package's explicit public exports;
future operational workers can reuse the library without importing apps/api.

Facilities/catalog and inventory commands, audits and saved idempotency results participate
in one tenant-scoped unit of work. Inventory exposes executeIn for caller-owned transactions;
its exact quantity, lock and replay policy is documented in ../../docs/INVENTORY.md. Domain/application layers import no HTTP, Nest, React or database libraries.
Infrastructure implements the ports. Configuration/migration paths refer to this repository.
Published adapters are for process composition; peer modules use published use cases/ports.

Run pnpm build and pnpm check:boundaries from the repository root. Database tests use
pnpm test:integration; never use operational records as verification fixtures.
