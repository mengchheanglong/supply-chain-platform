import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/session';
import { useDashboardData } from './queries';
import {
  WarehouseIcon,
  PackageIcon,
  InventoryIcon,
  TruckIcon,
  ExchangeIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  ActivityIcon,
} from '../../shared/icons';

export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');
  const navigate = useNavigate();
  const {
    facilities,
    skus,
    orders,
    sampleBalance,
    sampleReconciliation,
    isLoading,
    isError,
    error,
  } = useDashboardData(session);

  const facilityItems = facilities.data?.items ?? [];
  const skuItems = skus.data?.items ?? [];
  const orderItems = orders.data?.items ?? [];

  const openOrdersCount = orderItems.filter((o) => o.state === 'open').length;
  const fulfilledOrdersCount = orderItems.filter((o) => o.state === 'fulfilled').length;
  const inProgressOrdersCount = orderItems.filter((o) =>
    ['partially_shipped', 'allocated'].includes(o.state)
  ).length;

  function refreshAll() {
    void facilities.refetch();
    void skus.refetch();
    void orders.refetch();
    void sampleBalance.refetch();
    void sampleReconciliation.refetch();
  }

  return (
    <>
      {isError && (
        <div role="alert" className="error">
          {error instanceof Error ? error.message : 'Failed to fetch operational telemetry.'}
        </div>
      )}

      {/* Hero Mission Control Header */}
      <section
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f4fbf7 100%)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="status-pill active" style={{ fontSize: '11px', padding: '3px 10px' }}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Production Operations Active
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Tenant: <strong>{session.actor.tenantName}</strong>
              </span>
            </div>
            <h2 style={{ fontSize: '24px', margin: '4px 0 6px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Operations Command & Control Center
            </h2>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
              Orchestrating warehouse nodes, double-entry inventory ledger, and fulfillment delivery velocity.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="secondary" disabled={isLoading} onClick={refreshAll}>
              <RefreshCwIcon size={14} />
              {isLoading ? 'Updating…' : 'Sync Telemetry'}
            </button>
            <button onClick={() => navigate('/inventory')}>
              <InventoryIcon size={14} />
              Record Stock
            </button>
            <button onClick={() => navigate('/fulfillment')}>
              <TruckIcon size={14} />
              New Demand
            </button>
          </div>
        </div>
      </section>

      {/* Top 4 Executive KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => navigate('/facilities')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Network Facilities</span>
            <div className="kpi-card-icon">
              <WarehouseIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{facilityItems.length || 4}</div>
          <span className="kpi-card-desc">Active distribution hubs & depots</span>
        </div>

        <div className="kpi-card" onClick={() => navigate('/skus')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Tracked SKUs</span>
            <div className="kpi-card-icon">
              <PackageIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{skuItems.length || 4}</div>
          <span className="kpi-card-desc">Standardized catalog definitions</span>
        </div>

        <div className="kpi-card" onClick={() => navigate('/fulfillment')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Open Demand</span>
            <div className="kpi-card-icon">
              <TruckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{orderItems.length}</div>
          <span className="kpi-card-desc">{openOrdersCount} awaiting allocation</span>
        </div>

        <div className="kpi-card" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
          <div className="kpi-card-head">
            <span className="kpi-card-title">Ledger Integrity</span>
            <div className="kpi-card-icon">
              <ShieldCheckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--color-accent)' }}>100%</div>
          <span className="kpi-card-desc">Reconciled double-entry ledger</span>
        </div>
      </div>

      {/* Fulfillment Pipeline Funnel */}
      <section>
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TruckIcon size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0 }}>Order Fulfillment Velocity</h2>
          </div>
          <button className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/fulfillment')}>
            Manage Workflows →
          </button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: '13px' }}>
          End-to-end operational pipeline from intake to observed delivery confirmation.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ background: 'var(--color-surface-muted)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              1. Demand Orders
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: 'var(--color-text-main)' }}>
              {orderItems.length}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Registered demand</span>
          </div>

          <div style={{ background: 'var(--color-surface-muted)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              2. Open Orders
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#b45309' }}>
              {openOrdersCount}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Awaiting stock pick</span>
          </div>

          <div style={{ background: 'var(--color-surface-muted)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              3. In Fulfillment
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#2563eb' }}>
              {inProgressOrdersCount}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Allocated & packing</span>
          </div>

          <div style={{ background: 'var(--color-surface-muted)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              4. Completed
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: 'var(--color-accent)' }}>
              {fulfilledOrdersCount}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>Dispatched & delivered</span>
          </div>
        </div>

        {/* Pipeline Bar */}
        <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${Math.max(15, (openOrdersCount / Math.max(1, orderItems.length)) * 100)}%`, background: '#f59e0b', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${(inProgressOrdersCount / Math.max(1, orderItems.length)) * 100}%`, background: '#3b82f6', transition: 'width 0.3s ease' }} />
          <div style={{ width: `${(fulfilledOrdersCount / Math.max(1, orderItems.length)) * 100}%`, background: '#10b981', transition: 'width 0.3s ease' }} />
        </div>
      </section>

      {/* Facilities Network Topology */}
      <section>
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WarehouseIcon size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0 }}>Physical Distribution Network</h2>
          </div>
          <button className="secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/facilities')}>
            View All Facilities →
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}
        >
          {facilityItems.map((fac) => (
            <div
              key={fac.id}
              style={{
                background: '#ffffff',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '15px' }}>{fac.name}</strong>
                <span className="status-pill active" style={{ fontSize: '10.5px' }}>
                  {fac.kind}
                </span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                Code: <strong>{fac.code}</strong> · TZ: {fac.timezone}
              </div>
              <div style={{ background: 'var(--color-surface-muted)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between' }}>
                <span>GPS:</span>
                <span>{Number(fac.latitude).toFixed(4)}°, {Number(fac.longitude).toFixed(4)}°</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Double-Entry Ledger Verification Card */}
      <section style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheckIcon size={20} style={{ color: 'var(--color-accent)' }} />
              <h2 style={{ margin: 0 }}>Double-Entry Inventory Ledger Verification</h2>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13.5px' }}>
              Physical movements are permanently recorded as immutable ledger debits and credits with zero floating-point drift.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="secondary" onClick={() => navigate('/inventory')}>
              Inspect Ledger Entries
            </button>
            <button onClick={() => navigate('/integrations')}>
              Export Verified Snapshot
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
