# ADR-0003 — Scalable operational architecture and code boundaries

Date: 2026-10-08. Status: Accepted; foundation alignment verified locally in ARCH-01 on 2026-10-09.
This refines ADR-0001 and retains ADR-0002's PostgreSQL/query/migration choice.

## Context

The user requested a professional architecture, framework and folder structure before
further feature work. OPS-01 demonstrates local authentication, tenant-safe master data,
audits and migrations, but its backend master-data file and frontend entry file combine
several responsibilities. No capacity benchmark or production deployment exists yet.

Stock, reservation and shipment commands need strong transaction boundaries. Imports,
reports, simulation and optimization have different runtime/resource needs. The surrounding
workspace already assigns routing and synthetic planning to independent repositories.

## Decision

- Keep a NestJS/strict TypeScript modular operational monolith on supported Node.js LTS.
  Select Nest's official Fastify HTTP adapter during ARCH-01.
- Keep PostgreSQL/PostGIS, native parameterized `pg` and immutable ordered SQL migrations.
  Module-owned repositories participate in one explicit tenant-scoped unit of work.
- Put backend domain/application code in `packages/operations`; thin Nest HTTP modules in
  `apps/api` compose it. A future operational worker consumes the same library. Enforce public
  module imports and dependency direction in CI; keep domain rules independent of frameworks.
- Keep React/TypeScript/Vite. Use feature folders, React Router, TanStack Query, lazy routes
  and bounded server pagination. Generate the typed HTTP client from reviewed OpenAPI output.
- Introduce a separate operational worker, BullMQ/dedicated Redis and transactional outbox
  with the first durable background workflow. Keep stock authority in PostgreSQL.
- Preserve independent Rust routing, isolated simulation and future optimization boundaries.
  Planning receives approved immutable artifacts, with no operational write identity.
- Make stateless API deployment, global connection budgets, telemetry, repeatable load
  evidence and recovery tests part of delivery. Choose hosting and pilot SLOs from evidence.

The complete layout, ownership, contracts and scaling rules are in
[the architecture design](../ARCHITECTURE.md). All later implementation must follow it.
ARCH-01 precedes OPS-02 and now passes locally using Fastify;
[verification evidence](../ARCHITECTURE_VERIFICATION.md) records results and limits.

## Alternatives and consequences

Per-domain microservices would introduce distributed stock/fulfillment coordination before
we have a measured deployment need. The modular monolith keeps those transactions local;
published module interfaces leave a controlled extraction path when justified.

Go, Rust, Java/Spring and .NET are viable operational backend families. Our established
TypeScript/Nest code and operational workload provide no evidence that a language rewrite
would improve this application's capacity. Keep computation-heavy solving/routing in their
dedicated runtimes. This is a project-fit judgment, not a cross-framework speed ranking.

Express remains a capable adapter. We choose Fastify early for its supported Nest integration
and HTTP efficiency focus; middleware/filter compatibility and real workload measurements
are required. Existing framework benchmark numbers are not this platform's throughput.

Explicit SQL keeps stock locking, constraints and tenant policies visible. Repository mapping,
runtime validation and migration tooling remain our responsibility. Adding an ORM later
would need a concrete benefit and preserve those invariants.

Shared backend packaging adds a small build/composition cost now and prevents worker code
from depending on an API process. Import rules and integration evidence matter more than
folder names. New modules and infrastructure are introduced with implemented workflows.

No stack can promise permanent freedom from migrations. This decision aims to make capacity
changes local: add API/worker capacity, tune queries, introduce reporting stores or extract
a bounded module while retaining the operational contracts and domain rules.

## Acceptance

ARCH-01 must satisfy the [roadmap](../ROADMAP.md): preserve OPS-01 behavior and applied SQL,
prove Fastify compatibility, enforce boundaries, check generated contracts, exercise scoped
frontend state/pagination and establish a reproducible performance baseline. Documentation
alone does not satisfy those gates or establish enterprise readiness.
