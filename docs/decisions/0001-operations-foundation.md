# ADR-0001 — Separate operational platform foundation

Date: 2026-10-08. Status: Adopted; OPS-01 implemented locally, later domains pending.

## Context

The later plan names a broad platform while the enterprise blueprint proposes read-only
decision support. The legacy marketplace cannot safely become operational authority by
copying its demo identities, fixture persistence or inventory semantics.

## Decision

Keep supply-chain-platform independent and bounded to warehouse/inventory/fulfillment/
distribution operations. Start a NestJS/strict TypeScript modular monolith with a React
operations UI and PostgreSQL/PostGIS. Own business migrations here. Use a transactional,
auditable stock ledger/reservation model. Export approved snapshots to independent
simulation and later optimization services. Initial platform ports are 3100/3101.

The parent owns development orchestration. The existing marketplace is a selective
reference. Reuse osm-pathfinder as a service. Do not create the future intelligence repo
until data/matrix/solver prerequisites justify implementation.

## Consequences

Clear operational ownership and gradual delivery; no blanket code migration or inherited
five-database burden. OPS-01 implements the app shell, scoped local access, master-data
tenant isolation and migrations. Stock consistency and pilot identity work still need
implementation; production readiness remains a separate verification gate.
