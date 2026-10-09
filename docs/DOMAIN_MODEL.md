# Operational domain language — version 0, design foundation

OPS-01 implements tenants/scoped access, facilities and SKUs. OPS-02 implements movement
ledger, balance, reservation and receive/release/consume commands; see [inventory rules](INVENTORY.md).
OPS-03 implements orders/lines, fixed-quantity allocation batches and shipment states;
see [workflow policy](FULFILLMENT.md). Consolidation, stops/tours/fleet and planning contracts
below remain proposed requirements.

## Identity and network

- Tenant/Organization: access and ownership boundary.
- Facility: warehouse/depot with source identity, location confidence, business timezone
  and operational status. Dock/bin detail is added when an implemented workflow needs it.
- SKU: stocked article with unit-of-measure and handling metadata. Product marketing pages
  and shopping-cart identity are separate from stock-keeping identity.
- Customer: authorized recipient/account; retain minimum necessary personal data.

## Inventory

- InventoryMovement: immutable signed physical stock change by tenant/facility/SKU, quantity,
  reason, source document, actor, timestamp and idempotency key.
- InventoryBalance: transactionally maintained/reconcilable projection of physical on-hand.
- Reservation: allocated quantity linked to demand, with active/released/consumed state.
- Available = on_hand - active_reserved; it must not become negative.
- Receiving increases physical on-hand once. Reservation reduces availability without
  reducing physical stock. Cancellation releases once. Shipment confirmation consumes
  the reservation and decreases physical on-hand once in a transaction.
- Adjustments require explicit reason/audit. Partial shipment and transfer workflows
  must publish conservation/reconciliation rules before implementation.
- Quantity precision and conversion are explicit; do not assume every SKU is a whole item.

## Fulfillment and distribution

- Order/OrderLine: demand and requested service; total/price authority is server-side when
  pricing is in scope. Requested units and fulfilled units remain separate.
- Allocation: assigns eligible stock/reservation to demand.
- Fulfillment: actual picking/packing progress against allocated quantities.
- Shipment/ShipmentLine: transported fulfillment units; may consolidate/split orders.
- Stop: a physical pickup/delivery activity with service time and requested window.
- Tour: ordered stops for vehicle/driver; routing computes paths, optimization decides sequencing.
- Vehicle/Driver/Shift: availability and capability, not merely an animated marker.

Use explicit state-machine tables and commands. Do not infer actual delivery from a
simulated arrival; observed delivery evidence and synthetic events have different provenance.

## Integration and planning

- DatasetExport/Import: tenant/source mapping, schema version, quality report and lineage.
- InventorySnapshot: read-only point-in-time stock/reservation representation.
- NetworkSnapshot: immutable content-addressed approved facilities, demand, fleet and costs.
- ScenarioDefinition/Run/OptimizationResult: belong to the future planning layer.

Use stable internal IDs and tenant-scoped external mapping; meters, seconds, kilograms,
cubic meters and explicit currency. Business display begins with Asia/Phnom_Penh while
storage uses UTC. A snapshot is not a promise of current stock availability.
