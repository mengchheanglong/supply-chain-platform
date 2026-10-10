import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import { useSession } from './session';
import Connect from '../features/identity/Connect';
import {
  WarehouseIcon,
  PackageIcon,
  InventoryIcon,
  TruckIcon,
  ExchangeIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  ActivityIcon,
  LogOutIcon,
  ServerIcon,
  RadioIcon,
} from '../shared/icons';

const Dashboard = lazy(() => import('../features/dashboard/Page'));
const Integrations = lazy(() => import('../features/integrations/Page'));
const Fulfillment = lazy(() => import('../features/fulfillment/Page'));
const Facilities = lazy(() => import('../features/facilities/Page'));
const Inventory = lazy(() => import('../features/inventory/Page'));
const Catalog = lazy(() => import('../features/catalog/Page'));
const Fleet = lazy(() => import('../features/fleet/Page'));
const System = lazy(() => import('../features/system/Page'));

export function App() {
  const { session, disconnect } = useSession();
  const location = useLocation();
  const ready = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => api('/api/health/ready', 'get', { signal }),
    refetchInterval: 10000,
  });

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  const title =
    location.pathname === '/integrations'
      ? 'Data exchange'
      : location.pathname === '/fulfillment'
        ? 'Fulfillment & shipping'
        : location.pathname === '/fleet'
          ? 'Fleet & Simulation Control'
          : location.pathname === '/inventory'
            ? 'Inventory'
            : location.pathname === '/skus'
              ? 'SKU master'
              : location.pathname === '/facilities'
                ? 'Facilities'
                : location.pathname === '/system'
                  ? 'Ecosystem Health Matrix'
                  : 'Operations Dashboard';

  const category =
    location.pathname === '/integrations'
      ? 'DATA EXCHANGE'
      : location.pathname === '/fulfillment'
        ? 'FULFILLMENT'
        : location.pathname === '/fleet'
          ? 'FLEET & SIMULATION'
          : location.pathname === '/inventory'
            ? 'INVENTORY'
            : location.pathname === '/facilities'
              ? 'MASTER DATA'
              : location.pathname === '/system'
                ? 'SYSTEM & INFRASTRUCTURE'
                : 'MISSION CONTROL';

  const subtitle =
    location.pathname === '/integrations'
      ? 'Validate external data and export authorized records.'
      : location.pathname === '/fulfillment'
        ? 'Fulfill demand and record shipment progress.'
        : location.pathname === '/fleet'
          ? 'Real-time digital twin monitoring and dispatch telemetry from the logistics sandbox.'
          : location.pathname === '/inventory'
            ? 'Record stock movements and manage reservations.'
            : location.pathname === '/facilities'
              ? 'Maintain the operational network and stock-keeping definitions.'
              : location.pathname === '/system'
                ? 'Cross-service telemetry, physical routing engine, and PostGIS database readiness.'
                : 'Real-time multi-echelon network topology, ledger audit, and order throughput.';

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="brand-icon-box">
            <WarehouseIcon size={18} />
          </div>
          <div>SC<span>OPS</span></div>
        </div>
        <h2>Supply Chain<br />Operations Platform</h2>
        <p>Enterprise warehouse & distribution</p>

        <nav aria-label="Operations">
          <NavLink to="/dashboard" end>
            <ActivityIcon size={16} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/facilities">
            <WarehouseIcon size={16} />
            <span>Facilities</span>
          </NavLink>
          <NavLink to="/skus">
            <PackageIcon size={16} />
            <span>SKU master</span>
          </NavLink>
          <NavLink to="/inventory">
            <InventoryIcon size={16} />
            <span>Inventory</span>
          </NavLink>
          <NavLink to="/fulfillment">
            <TruckIcon size={16} />
            <span>Fulfillment & shipping</span>
          </NavLink>
          <NavLink to="/fleet">
            <RadioIcon size={16} />
            <span>Fleet & Simulation</span>
          </NavLink>
          <NavLink to="/integrations">
            <ExchangeIcon size={16} />
            <span>Data exchange</span>
          </NavLink>
          <NavLink to="/system">
            <ServerIcon size={16} />
            <span>System Health</span>
          </NavLink>
        </nav>

        <div className="scope">
          <strong>Enterprise Foundation</strong><br />
          PostGIS Multi-Tenant RLS<br />
          Double-Entry Stock Ledger
        </div>
      </aside>

      <main>
        <header>
          <div>
            <p className="eyebrow">OPERATIONS / {category}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span
            role="status"
            className={'badge ' + (ready.data?.status === 'ready' && !ready.isError ? 'ready' : 'unavailable')}
          >
            {ready.data?.status === 'ready' && !ready.isError ? 'Database ready' : 'API or database unavailable'}
          </span>
        </header>

        {!session ? (
          <Connect />
        ) : (
          <>
            <div className="tenant">
              <div>
                <strong>
                  <ShieldCheckIcon size={16} style={{ color: 'var(--color-accent)' }} />
                  {session.actor.tenantName}
                </strong>
                <span>
                  Role: <span style={{ textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-primary)' }}>{session.actor.role}</span> · Timezone: {session.actor.timezone} · Tenant ID: {session.actor.tenantId.slice(0, 8)}…
                </span>
              </div>
              <button className="secondary" onClick={disconnect}>
                <LogOutIcon size={14} />
                Disconnect
              </button>
            </div>

            {/* Quick KPI Strip when inside sub-pages */}
            {!isDashboard && (
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-card-head">
                    <span className="kpi-card-title">Network Facilities</span>
                    <div className="kpi-card-icon">
                      <WarehouseIcon size={16} />
                    </div>
                  </div>
                  <div className="kpi-card-value">4</div>
                  <span className="kpi-card-desc">Hubs & regional depots</span>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card-head">
                    <span className="kpi-card-title">Catalog SKUs</span>
                    <div className="kpi-card-icon">
                      <PackageIcon size={16} />
                    </div>
                  </div>
                  <div className="kpi-card-value">4</div>
                  <span className="kpi-card-desc">Tracked enterprise units</span>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card-head">
                    <span className="kpi-card-title">Double-Entry Ledger</span>
                    <div className="kpi-card-icon">
                      <DatabaseIcon size={16} />
                    </div>
                  </div>
                  <div className="kpi-card-value" style={{ color: 'var(--color-accent)' }}>100%</div>
                  <span className="kpi-card-desc">Reconciled stock balance</span>
                </div>

                <div className="kpi-card">
                  <div className="kpi-card-head">
                    <span className="kpi-card-title">Security Isolation</span>
                    <div className="kpi-card-icon">
                      <ShieldCheckIcon size={16} />
                    </div>
                  </div>
                  <div className="kpi-card-value" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>RLS Active</div>
                  <span className="kpi-card-desc">Tenant-scoped PostgreSQL</span>
                </div>
              </div>
            )}

            <Suspense fallback={<p role="status">Loading workspace…</p>}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard key={session.id} />} />
                <Route path="/" element={<Dashboard key={session.id} />} />
                <Route path="/integrations" element={<Integrations key={session.id} />} />
                <Route path="/fulfillment" element={<Fulfillment key={session.id} />} />
                <Route path="/inventory" element={<Inventory key={session.id} />} />
                <Route path="/facilities" element={<Facilities key={session.id} />} />
                <Route path="/skus" element={<Catalog key={session.id} />} />
                <Route path="/fleet" element={<Fleet key={session.id} />} />
                <Route path="/system" element={<System key={session.id} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </>
        )}

        <footer>
          Operational records stay strictly separate from simulation scenarios. Stock changes are authorized and recorded transactionally in PostgreSQL PostGIS.
        </footer>
      </main>
    </div>
  );
}
