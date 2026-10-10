# Supply Chain Operations Platform — Design System Specification

## Visual Design System: Clean Minimalist "Stripe / Vercel" Light Precision

```yaml
Design System:
  aesthetic-school: Clean Minimalist Light Precision (Stripe / Vercel style)
  vibe: High-contrast authoritative clarity, hairline detail, zero decorative clutter, maximum data-ink ratio
  palette:
    ground: "#f8fafc" (clean neutral slate canvas)
    surface: "#ffffff" (pure crisp white panels)
    surface-muted: "#f1f5f9" (slate-100 for code, badges, table headers)
    hairline-border: "#e2e8f0" (crisp 1px border)
    ink-primary: "#0f172a" (slate-900 high-contrast text)
    ink-muted: "#64748b" (slate-500 secondary labels)
    ink-faint: "#94a3b8" (slate-400 placeholders)
    accent: "#0f172a" (solid high-contrast button) & "#2563eb" (Stripe royal cobalt)
    feedback:
      success: "#065f46" on "#ecfdf5" (1px border #a7f3d0)
      warning: "#92400e" on "#fffbeb" (1px border #fde68a)
      error: "#991b1b" on "#fef2f2" (1px border #fecaca)
  typography:
    family: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif"
    monospace: "'JetBrains Mono', 'SF Mono', Consolas, monospace"
    tabular-numerals: true (font-variant-numeric: tabular-nums)
  radii: 6px (inputs, buttons) / 8px (cards, tables) / 12px (dialogs) / 9999px (pills)
  elevation: Minimalist hairline borders with soft 1px dropshadow (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`)
```

---

## Key Structural Improvements

### 1. Streamlined App Shell & Navigation
- **Light Minimalist Sidebar**: Clean white sidebar (`#ffffff`), subtle 1px border-right (`#e2e8f0`), and compact 13px navigation links.
- **Removed Boilerplate Clutter**: Removed the redundant 4-card metric strip that was previously forced at the top of every sub-page, restoring vertical viewport to the actual page features.
- **Compact Breadcrumb & Tenant Bar**: Integrated a clean top breadcrumb and compact tenant status chip with a discreet disconnect action.

### 2. Operational Dashboard Workbench (`/dashboard`)
- **2-Column Operational Cockpit**:
  1. **Demand Queue (Left)**: Live search, state filters (`All`, `Open`, `In Progress`, `Fulfilled`), and interactive table with `[Allocate Line]` modal trigger.
  2. **Stock Inspector & Inbound Ledger (Right)**: Dynamic Facility & SKU dropdowns, live On Hand / Reserved / Available metrics, and inline Quick Inbound Receipt form writing to PostgreSQL ledger.

### 3. Route Optimization & Scenario Intelligence (`/optimization`)
- **Interactive VRPTW Solver**: Connected to `@distribution-intelligence/core` on port 3200.
- **3-Track Operational Comparison (EVAL-01)**: Side-by-side comparison between **Historical Actual**, **Greedy Baseline**, and **Metaheuristic Optimizer**.
- **Financial Cost-to-Serve**: Transparent breakdown in integer cents (overhead, distance wear, regular driver wages, overtime labor).
- **Monte Carlo Stochastic Evaluation**: 95% confidence intervals and pilot recommendations.

---

## Verification Evidence

- **Frontend Tests**: 9 test files, 24 unit & integration tests passing 100% (`pnpm --filter @supply-chain/web test`).
- **Production Build**: Clean compilation in 309ms, CSS bundle size reduced from 16.97 kB to 11.79 kB (`pnpm --filter @supply-chain/web build`).
- **Architectural Boundaries**: AST import boundary gate passed (`pnpm check:boundaries`).
- **Live Services**:
  - PostgreSQL PostGIS on `127.0.0.1:5433` (Ready)
  - OSM Pathfinder on `127.0.0.1:3000` (Ready)
  - Platform API on `127.0.0.1:3100` (Ready)
  - Platform Web SPA on `127.0.0.1:3101` (Live)
  - Solver Service on `127.0.0.1:3200` (Ready)
  - Logistics Sandbox on `127.0.0.1:3007` & `5173` (Ready)
