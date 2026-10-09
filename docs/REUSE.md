# Reuse from the existing projects

## Review and adapt selectively

- NestJS module/controller/DTO organization from ecommerce-hive-nosql.
- UI primitives and operations-table interaction ideas, after reviewing accessibility,
  dependency compatibility and license attribution.
- Order/product field concepts where they fit the new domain language; do not preserve
  the old overloaded product.stock authority or demo state-machine inconsistencies.
- Existing map viewer concepts from logistics-sandbox for later operations/planning views.
- Routing HTTP integration as a service contract, after graph/provenance validation.

## Rebuild as actual operational controls

- Auth/tenant authorization, rather than demo localStorage identity switching.
- Transactional ledger/reservation lifecycle, rather than order-create stock subtraction
  followed by independent simulated-delivery adjustment.
- Explicit persistence errors, rather than silent in-memory operational fallback.
- Shipment/fulfillment transitions and audit, rather than one global status string.
- Measured dependency/readiness/telemetry status, rather than static healthy metrics.

## Keep independent

Do not copy customer storefront/cart/payment/referral features, schema lab demonstrations,
five-database provisioning, simulation world ownership, or Rust road algorithms into this repo.
Business code reuse needs compatible licensing and preserved notices. The new application's
license is undecided; do not assume one or assign copyright owners automatically.
