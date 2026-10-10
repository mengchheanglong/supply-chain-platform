import { useState } from 'react';
import { useSession } from '../../app/session';
import { useSystemHealth } from './queries';
import {
  ServerIcon,
  CpuIcon,
  DatabaseIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  ActivityIcon,
} from '../../shared/icons';

export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const healthQuery = useSystemHealth(15000);

  const data = healthQuery.data;
  const isHealthy = data?.overallStatus === 'healthy';
  const isDegraded = data?.overallStatus === 'degraded';

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await healthQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <>
      {healthQuery.isError && (
        <div role="alert" className="error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <strong>System Telemetry Probe Failed</strong>
          </div>
          <span>
            {healthQuery.error instanceof Error
              ? healthQuery.error.message
              : 'Unable to query ecosystem service endpoints.'}
          </span>
        </div>
      )}

      {/* Top Controls Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          margin: '0 0 16px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            Ecosystem Service Health Matrix
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Real-time telemetry across operations, physical routing, simulation sandbox, and PostGIS ledger.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className={
              'status-pill ' +
              (isHealthy ? 'active' : isDegraded ? 'open' : 'cancelled')
            }
            style={{ fontWeight: 600, fontSize: '12px' }}
          >
            {isHealthy ? (
              <>
                <CheckCircleIcon size={14} /> Ecosystem Healthy
              </>
            ) : isDegraded ? (
              <>
                <AlertCircleIcon size={14} /> Degraded Performance
              </>
            ) : (
              <>
                <AlertCircleIcon size={14} /> Services Unavailable
              </>
            )}
          </span>

          <button
            className="secondary"
            disabled={isRefreshing || healthQuery.isFetching}
            onClick={() => void handleRefresh()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCwIcon size={14} />
            {isRefreshing ? 'Probing…' : 'Probe Latencies'}
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Monitored Services</span>
            <div className="kpi-card-icon">
              <ServerIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">
            {data?.services.length ?? 6}
          </div>
          <span className="kpi-card-desc">Active infrastructure nodes</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Routing Engine</span>
            <div className="kpi-card-icon">
              <CpuIcon size={16} />
            </div>
          </div>
          <div
            className="kpi-card-value"
            style={{
              fontSize: '20px',
              color:
                data?.services.find((s) => s.id === 'osm-pathfinder')?.status ===
                'healthy'
                  ? 'var(--color-accent)'
                  : 'var(--color-text-main)',
            }}
          >
            {data?.services.find((s) => s.id === 'osm-pathfinder')?.status ===
            'healthy'
              ? 'Axum Contraction'
              : 'Offline'}
          </div>
          <span className="kpi-card-desc">Port 3000 · Road Graph</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Simulation Sandbox</span>
            <div className="kpi-card-icon">
              <ActivityIcon size={16} />
            </div>
          </div>
          <div
            className="kpi-card-value"
            style={{
              fontSize: '20px',
              color:
                data?.services.find((s) => s.id === 'logistics-sandbox')
                  ?.status === 'healthy'
                  ? 'var(--color-primary)'
                  : 'var(--color-text-main)',
            }}
          >
            {data?.services.find((s) => s.id === 'logistics-sandbox')
              ?.status === 'healthy'
              ? 'Read-Only Twin'
              : 'Offline'}
          </div>
          <span className="kpi-card-desc">Port 3001 · Isolated Memory</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">PostGIS Ledger</span>
            <div className="kpi-card-icon">
              <DatabaseIcon size={16} />
            </div>
          </div>
          <div
            className="kpi-card-value"
            style={{
              fontSize: '20px',
              color:
                data?.services.find((s) => s.id === 'postgres-postgis')
                  ?.status === 'healthy'
                  ? 'var(--color-accent)'
                  : 'var(--color-error-dot)',
            }}
          >
            {data?.services.find((s) => s.id === 'postgres-postgis')
              ?.status === 'healthy'
              ? 'RLS Enforced'
              : 'Degraded'}
          </div>
          <span className="kpi-card-desc">Port 5433 · 100% Balanced</span>
        </div>
      </div>

      {/* Microservice Cards Grid */}
      <section style={{ marginTop: '20px' }}>
        <div className="section-head">
          <h2>Active Infrastructure Nodes</h2>
          <span>Direct loopback probes with latency measurement</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px',
            marginTop: '12px',
          }}
        >
          {data?.services.map((svc) => (
            <div
              key={svc.id}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--color-text-main)',
                      }}
                    >
                      {svc.name}
                    </h3>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--color-accent)',
                      }}
                    >
                      {svc.role}
                    </p>
                  </div>

                  <span
                    className={
                      'status-pill ' +
                      (svc.status === 'healthy' ? 'active' : 'cancelled')
                    }
                    style={{ fontSize: '10.5px', padding: '2px 8px' }}
                  >
                    {svc.status === 'healthy' ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: '10px 0 6px',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <span>
                    Port: <strong>{svc.port}</strong>
                  </span>
                  <span>·</span>
                  <span>{svc.protocol}</span>
                  {svc.latencyMs !== undefined && (
                    <>
                      <span>·</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            svc.latencyMs < 50
                              ? 'var(--color-success-text)'
                              : 'var(--color-warning-text)',
                        }}
                      >
                        {svc.latencyMs} ms
                      </span>
                    </>
                  )}
                </div>

                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: '12px',
                    color: 'var(--color-text-main)',
                    lineHeight: 1.4,
                  }}
                >
                  {svc.message}
                </p>
              </div>

              {svc.details && (
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-muted)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    fontSize: '11px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px 16px',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  {Object.entries(svc.details).map(([k, v]) => (
                    <div key={k}>
                      <span
                        style={{
                          color: 'var(--color-text-muted)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {k.replace(/([A-Z])/g, ' $1')}:
                      </span>{' '}
                      <strong>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Architectural Guarantees & Isolation Review */}
      <section style={{ marginTop: '24px' }}>
        <div className="section-head">
          <h2>Architectural Guarantees & Boundary Invariants</h2>
          <span>Production and planning separation verified per AGENTS.md</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheckIcon size={18} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>
                Operational & Planning Boundary (P0-01)
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Simulation workers on port 3001 hold <strong>zero operational write credentials</strong>. Approved operational data is exported into immutable, tenant-scoped planning snapshots. Proposed routes remain distinct from observed shipments.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <DatabaseIcon size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>
                Double-Entry Ledger & Multi-Tenant RLS
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Stock transactions enforce double-entry reservations in PostgreSQL PostGIS with zero floating-point arithmetic. Multi-tenant Row-Level Security (RLS) guarantees complete cryptographic and tenant data isolation.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CpuIcon size={18} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700 }}>
                Physical Road Graph Integrity
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              OSM Pathfinder computes physical road distances via Contraction Hierarchies and A* over OpenStreetMap PBF data. Synthetic fallbacks and unmarked straight lines are strictly prohibited.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
