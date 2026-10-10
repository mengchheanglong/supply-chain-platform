# 🏭 Supply Chain Operations Platform

The operational core and sovereign authority for warehouses, facilities, double-entry inventory ledgers, order fulfillment, and immutable planning snapshots.

[![Node.js Version](https://img.shields.io/badge/node-24_LTS-339933?logo=node.js)](https://nodejs.org)
[![pnpm Version](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify)](https://fastify.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18_%2B_PostGIS_3.6-336791?logo=postgresql)](https://postgis.net)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.x-B73BFE?logo=vite)](https://vitejs.dev)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.x-FF4154?logo=reactquery)](https://tanstack.com/query)
[![Web Tests](https://img.shields.io/badge/web_tests-24%2F24_passed-brightgreen.svg)]()
[![API Port](https://img.shields.io/badge/API_Port-8100-blue)](http://localhost:8100)
[![Web Port](https://img.shields.io/badge/Web_Port-8101-purple)](http://localhost:8101)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎯 Overview & Product Boundary

`supply-chain-platform` serves as the single transactional source of truth for the physical supply chain ecosystem:
- **Operational Authority**: Manages physical warehouse facilities, stock keeping units (SKUs), and double-entry inventory balances.
- **Double-Entry Stock Ledger**: Implements transaction-safe, append-only inventory movements where balances are derived dynamically (`available = on_hand - reserved`).
- **End-to-End Fulfillment Workflows**: Orchestrates demand order ingestion, partial batch allocation, picking, packing, shipping dispatch, and observed delivery.
- **Tenant Isolation**: Forced PostgreSQL Row-Level Security (RLS) ensures full multi-tenant data segregation.
- **Enterprise Governance**: Cryptographically chained SHA-256 audit logs (`PILOT-01`) and trigger-guarded immutable planning snapshots (`DATA-02`).

> [!IMPORTANT]
> **Operational Isolation Invariant (`AGENTS.md`)**:
> Simulation engines (`logistics-sandbox`) and route solvers (`fleet-route-optimizer`) are **never** granted database write credentials. They ingest read-only immutable planning snapshots exported by this platform.

---

## 🏛️ System Architecture

The platform is designed as a high-performance **modular monolith**, cleanly decoupling the HTTP transmission layer from domain logic and module-owned SQL adapters.

```mermaid
flowchart TD
  subgraph Frontend ["Operations Web Console (Port 8101)"]
    WebUI["React 19 + Vite UI<br/>(TanStack Query, Cursor Pagination)"]
    Client["@supply-chain/api-client<br/>(Browser-Safe Typed Fetch)"]
    WebUI --> Client
  end

  subgraph API ["Operations API Layer (Port 8100)"]
    FastifyAPI["Fastify HTTP Engine<br/>(NestJS Modular Architecture)"]
    AuthGuard["Tenant Authentication Guard<br/>(OIDC / JWT & Scoped API Keys)"]
    OpenAPI["OpenAPI 3.1 Contract Generator<br/>(@supply-chain/contracts)"]
    Client -->|"Typed HTTP Queries"| FastifyAPI
    FastifyAPI --> AuthGuard
    FastifyAPI --> OpenAPI
  end

  subgraph Core ["Domain Core (@supply-chain/operations)"]
    MasterData["Facilities & SKUs<br/>(WGS84 Coordinates)"]
    InventoryMod["Double-Entry Inventory Ledger<br/>(Reserve, Release, Consume)"]
    FulfillmentMod["Fulfillment & Shipping Workflows<br/>(Pick, Pack, Ship, Deliver)"]
    SnapshotMod["Planning Snapshot Extractor<br/>(DATA-02 Artifacts)"]
    AuditMod["Cryptographic Audit Trail<br/>(PILOT-01 SHA-256 Hash Chain)"]
    
    FastifyAPI --> MasterData
    FastifyAPI --> InventoryMod
    FastifyAPI --> FulfillmentMod
    FastifyAPI --> SnapshotMod
    FastifyAPI --> AuditMod
  end

  subgraph Storage ["Operational Persistence (Port 5433)"]
    PostgresDB["PostgreSQL 18 + PostGIS 3.6<br/>(supply_chain_ops)"]
    RLS["Row-Level Security Policies<br/>(Forced Tenant Isolation)"]
    Triggers["history_guard Triggers<br/>(Immutable Snapshot Integrity)"]
    
    MasterData --> PostgresDB
    InventoryMod --> PostgresDB
    FulfillmentMod --> PostgresDB
    SnapshotMod --> Triggers
    Triggers --> PostgresDB
    PostgresDB --- RLS
  end
```

---

## 🏆 Verified Milestones & Domain Capabilities

| Milestone | Domain Capability | Architectural Acceptance Criteria & Status |
| :---: | :--- | :--- |
| **`ARCH-01`** | **Modular Monolith Foundation** | Fastify HTTP runtime, backend-only domain packages, typed browser client, cursor pagination, and lazy route loading. |
| **`OPS-01`** | **Master Data & Scoped Access** | Facilities with WGS84 geometries, SKU master records, tenant RLS policies, and transactional creation audits. |
| **`OPS-02`** | **Double-Entry Inventory Ledger** | Append-only movement ledger, exact non-negative integer math, idempotent reservations, and reserve/release/consume lifecycles. |
| **`OPS-03`** | **Order Fulfillment Lifecycle** | Inbound demand orders, multi-item partial allocations, explicit pick/pack/ship operations, and observed delivery tracking. |
| **`DATA-01`** | **Bounded Data Exchange** | External stock CSV staging with isolated schema validation, error reporting, and tenant-authorized operational exports. |
| **`DATA-02`** | **Immutable Planning Snapshots** | Tenant-scoped CSV snapshot generation (`facilities.csv`, `skus.csv`, `stock.csv`, `orders.csv`) protected by PostgreSQL `history_guard` triggers and root SHA-256 manifests. |
| **`PILOT-01`** | **Enterprise Security & Audit** | OIDC/JWT Bearer validation, RBAC (Operator vs. Reader), tamper-evident SHA-256 hash-chained audit logs, and automated backup verification. |

---

## 📍 Master Facilities & Catalog

The operational platform manages four regional distribution centers across Cambodia, complete with PostGIS spatial coordinates and road connectivity:

| Facility Code | Name | Location (Lat, Lon) | Role & Operational Function |
| :--- | :--- | :--- | :--- |
| **`DC-PNH-01`** | Phnom Penh Central Fulfillment Hub | `11.5564°, 104.9282°` | Primary national fulfillment hub, high-velocity picking, and urban cross-docking |
| **`DC-REP-01`** | Siem Reap Regional Depot | `13.3671°, 103.8448°` | Northern regional depot serving hospitality, retail, and tourism corridors |
| **`DC-KOS-01`** | Sihanoukville Coastal Cross-Dock | `10.6253°, 103.5234°` | Deep-water port logistics center and southern coastal distribution gateway |
| **`DC-BAT-01`** | Battambang Distribution Center | `13.0957°, 103.2022°` | Western agricultural and domestic trade distribution center |

### Unified Enterprise Catalog SKUs

- **`SKU-FOOD-01`**: Organic Jasmine Malys Rice (5kg) — Dry storage food grade
- **`SKU-ELEC-01`**: Solar Inverter Hybrid Battery 5kWh — Regulated heavy electronics
- **`SKU-COLD-01`**: Temperature-Controlled Vaccine Vial (2–8°C) — Cold-chain pharmaceutical
- **`SKU-MED-01`**: Rapid Emergency Trauma First Aid Kit — Critical healthcare supply

---

## ⚡ REST API Reference (Port 8100)

All business endpoints require a tenant-scoped Bearer token or authorized API Key.

### 1. Health & System Diagnostics
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health/live` | Public | Liveness probe; verifies Fastify process is running |
| `GET` | `/api/health/ready` | Public | Readiness probe; validates PostgreSQL connection, PostGIS extensions, migration checksums, and non-superuser role restrictions |

### 2. Tenant Context & Master Data
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/context` | Reader | Validates token and returns authenticated tenant identity and RBAC role |
| `GET` | `/api/v1/facilities` | Reader | Lists operational facilities with WGS84 coordinates and cursor pagination |
| `POST` | `/api/v1/facilities` | Operator | Registers a new warehouse facility with spatial point geometry |
| `GET` | `/api/v1/skus` | Reader | Lists catalog SKUs with explicit unit types and zero-precision decimal scales |
| `POST` | `/api/v1/skus` | Operator | Creates a new enterprise SKU record |

### 3. Double-Entry Inventory Ledger
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/inventory/receive` | Operator | Records inbound stock receipt into the append-only movement ledger |
| `POST` | `/api/v1/inventory/reserve` | Operator | Idempotently places a temporary stock hold against available inventory |
| `POST` | `/api/v1/inventory/release` | Operator | Releases an active stock hold back to available status |
| `POST` | `/api/v1/inventory/consume` | Operator | Consumes a reserved stock hold upon shipment dispatch |
| `GET` | `/api/v1/inventory/balance` | Reader | Computes real-time stock balances: `available = on_hand - reserved` |
| `GET` | `/api/v1/inventory/movements`| Reader | Retrieves chronological audit trail of all physical stock movements |

### 4. Demand Orders & Fulfillment Workflow
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/fulfillment/orders` | Reader | Lists demand orders with status filters (`PENDING`, `ALLOCATED`, `SHIPPED`, `DELIVERED`) |
| `POST` | `/api/v1/fulfillment/orders` | Operator | Ingests a new demand order (called by `ecommerce-storefront` bridge) |
| `POST` | `/api/v1/fulfillment/allocate`| Operator | Allocates inventory across depots and transitions order to `ALLOCATED` |
| `POST` | `/api/v1/fulfillment/pick` | Operator | Confirms picking tasks for reserved order line items |
| `POST` | `/api/v1/fulfillment/pack` | Operator | Packages line items into verified containers for transit |
| `POST` | `/api/v1/fulfillment/ship` | Operator | Dispatches order with transport carrier and consumes stock hold |
| `POST` | `/api/v1/fulfillment/deliver` | Operator | Records proof of observed delivery at destination |

### 5. Planning Snapshots & Data Exchange
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/snapshots/export` | Operator | Triggers `DATA-02` immutable planning snapshot export with SHA-256 manifests |
| `POST` | `/api/v1/exchange/import` | Operator | Stages external stock CSV for schema validation and discrepancy reporting |

### 6. Audit Logging (`PILOT-01`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/audit/logs` | Reader | Queries tamper-evident SHA-256 hash-chained operational audit records |

---

## 🔒 Double-Entry Inventory Mechanics

To eliminate phantom inventory and race conditions, the platform enforces strict double-entry ledger semantics:

> **Core Balance Invariant**: `Available Stock = On-Hand Stock − Active Reservations`

```mermaid
flowchart TD
  Receipt["📥 <b>Inbound Receipt</b><br/>+On-Hand Stock (Movements Ledger)"] --> Order["📋 <b>Demand Order Ingestion</b><br/>+Reservation Hold (Available Stock Decreases)"]
  Order --> Cancel["❌ <b>Order Cancelled</b><br/>-Reservation Hold<br/><i>Available Stock Restored</i>"]
  Order --> Dispatch["🚚 <b>Shipment Dispatched</b><br/>-Reservation Hold & -On-Hand Stock<br/><i>Physical Stock Consumed</i>"]
```

- **No Floating-Point Arithmetic**: Quantities are represented as exact scaled strings and non-negative integers.
- **Idempotency Keys**: All inventory write commands require an `idempotencyKey` preventing duplicate deductions during network retries.

---

## 🔗 Cross-Ecosystem Contracts

- **Storefront Bridge (`ecommerce-storefront` :8400 ➔ :8100)**: Customer checkout triggers `SupplyChainBridgeService`, calling `POST /api/v1/fulfillment/orders` with delivery coordinates and allocating PostGIS inventory.
- **Mission Control (`supply-chain-control-tower` :8300 ➔ :8100)**: The Control Tower proxies requests to `/proxy/platform/*`, providing real-time facility telemetry and stock movements.
- **Planning Hand-off (`:8100` ➔ `fleet-route-optimizer` & `logistics-sandbox`)**: Trigger-guarded immutable snapshots (`DATA-02`) allow route solvers and simulation twins to run offline without database credentials.

---

## 🚀 Getting Started & Local Development

### Prerequisites
- **Node.js** 24 LTS & **pnpm** 10.32.1
- **PostgreSQL 18 + PostGIS 3.6** running on port `5433` (via root `./scripts/Workspace.ps1 up`)

### 1. Installation & Environment
```powershell
cd supply-chain-platform
pnpm install --frozen-lockfile
Copy-Item .env.example .env
```

Ensure `.env` points to the local operations database:
```env
DATABASE_URL=postgresql://operations_app:local_operations_secret@127.0.0.1:5433/supply_chain_ops
PORT=8100
WEB_PORT=8101
```

### 2. Database Migrations & Tenant Creation
```powershell
# 1. Build TypeScript packages and generate contracts
pnpm build

# 2. Run checksum-pinned database migrations
pnpm migrate

# 3. Create your initial organization tenant
pnpm tenant:create "Cambodia Express Logistics" Asia/Phnom_Penh
```
> The command outputs a generated operator token to `.secrets/<tenant-id>.json`. Copy this token to authenticate in the UI.

### 3. Starting Development Servers
```powershell
# Terminal 1: Fastify API Engine (Port 8100)
pnpm dev:api

# Terminal 2: React 19 Operations UI (Port 8101)
pnpm dev:web
```

Open **[http://localhost:8101](http://localhost:8101)** in your browser and enter your operator token.

---

## 🧪 Testing & Verification Suite

```powershell
# Run monorepo typechecks and contract freshness checks
pnpm check:boundaries

# Run React 19 Web UI tests (24/24 PASS)
pnpm test:web

# Run API unit & PILOT-01 cryptographic audit tests (8/8 PASS)
pnpm test

# Comprehensive end-to-end monorepo build and verification
pnpm verify
```

---

## 📁 Repository Layout

```text
supply-chain-platform/
├── apps/
│   ├── api/                      # Fastify HTTP service, routing, tenant auth & OpenAPI
│   └── web/                      # React 19 / Vite UI console (TanStack Query, Tailwind)
├── packages/
│   ├── operations/               # Domain logic & module-owned PostgreSQL SQL adapters
│   │   ├── src/facilities/       # PostGIS facilities and location provenance
│   │   ├── src/skus/             # SKU master catalog records
│   │   ├── src/inventory/        # Double-entry ledger and reservation lifecycle
│   │   ├── src/fulfillment/      # Demand orders, picking, packing, and dispatch
│   │   ├── src/snapshots/        # DATA-02 immutable planning snapshot extractor
│   │   └── src/pilot/            # PILOT-01 OIDC validator & SHA-256 audit chaining
│   ├── contracts/                # Generated versioned OpenAPI specification & wire types
│   └── api-client/               # Browser-safe typed fetch client
├── database/
│   └── migrations/               # Checksum-pinned PostgreSQL 18 / PostGIS 3.6 migrations
└── docs/                         # Domain models, acceptance criteria, and ADRs
```

---

## 📄 License
MIT License.
