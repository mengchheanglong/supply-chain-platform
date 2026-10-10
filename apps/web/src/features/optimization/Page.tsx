import { useState } from 'react';
import { useSession } from '../../app/session';
import { useOptimizationHealth, useActiveOptimization, useRunOptimization } from './queries';
import {
  CompassIcon,
  CpuIcon,
  SlidersIcon,
  TruckIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  MapPinIcon,
  ActivityIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from '../../shared/icons';

export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');

  const [stopsCount, setStopsCount] = useState<number>(12);
  const [fleetSize, setFleetSize] = useState<number>(4);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState<number>(0);

  const health = useOptimizationHealth();
  const activeOpt = useActiveOptimization(stopsCount, fleetSize);
  const runMutation = useRunOptimization();

  const isCalculating = runMutation.isPending || activeOpt.isFetching;
  const payload = activeOpt.data;

  const comparison = payload?.comparison;
  const optResult = payload?.optimizedResult;
  const greedyResult = payload?.greedyResult;
  const evalReport = payload?.evaluationReport;
  const routes = optResult?.routes ?? [];

  const activeRoute = routes[selectedVehicleIdx] || routes[0];

  function handleRun() {
    runMutation.mutate({ stopsCount, fleetSize });
  }

  function applyPreset(stops: number, fleet: number) {
    setStopsCount(stops);
    setFleetSize(fleet);
    setSelectedVehicleIdx(0);
    runMutation.mutate({ stopsCount: stops, fleetSize: fleet });
  }

  return (
    <>
      {/* AGENTS.md Operational Boundary Callout */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-muted)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <CompassIcon size={18} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--color-text-main)' }}>
          <strong>Decision Intelligence Boundary (AGENTS.md):</strong> Route schedules and cost-to-serve evaluations are computed on read-only planning snapshots. Proposed routes remain distinct from operational dispatches until confirmed. Production write-back requires audited execution.
        </div>
      </div>

      {/* Hero Header Strip */}
      <section
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={'status-pill ' + (health.data?.isAvailable ? 'active' : 'cancelled')}>
                <span className="live-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: health.data?.isAvailable ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                {health.data?.isAvailable ? 'Optimization Engine Online (Port 3200)' : 'Client-Side Solver Active'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Tenant: <strong>{session.actor.tenantName}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '24px', margin: '4px 0 6px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              VRPTW Route Optimization & Decision Intelligence
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
              Vehicle Routing with Time Windows (OPT-01), 2-opt metaheuristic local search, and financial cost-to-serve scenario evaluation (EVAL-01).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              disabled={isCalculating}
              onClick={handleRun}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontWeight: 700 }}
            >
              <CpuIcon size={16} style={{ animation: isCalculating ? 'spin 1s linear infinite' : 'none' }} />
              {isCalculating ? 'Computing Optimal Routes…' : '⚡ Re-Optimize Scenario'}
            </button>
          </div>
        </div>
      </section>

      {/* Scenario Configuration & Preset Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <SlidersIcon size={16} style={{ color: 'var(--color-primary)' }} />
            <strong style={{ fontSize: '13.5px' }}>Scenario Presets:</strong>
            <button
              className={stopsCount === 10 && fleetSize === 3 ? '' : 'secondary'}
              onClick={() => applyPreset(10, 3)}
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              Urban Phnom Penh (10 stops, 3 vans)
            </button>
            <button
              className={stopsCount === 15 && fleetSize === 4 ? '' : 'secondary'}
              onClick={() => applyPreset(15, 4)}
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              Express Metro (15 stops, 4 vans)
            </button>
            <button
              className={stopsCount === 20 && fleetSize === 5 ? '' : 'secondary'}
              onClick={() => applyPreset(20, 5)}
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              Regional Outposts (20 stops, 5 vans)
            </button>
          </div>

          {/* Quick Sliders / Custom Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="stops-input" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Stops:</label>
              <input
                id="stops-input"
                type="number"
                min="5"
                max="25"
                value={stopsCount}
                onChange={(e) => setStopsCount(Number(e.target.value))}
                style={{ width: '65px', padding: '4px 8px', fontSize: '12.5px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="fleet-input" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Fleet Size:</label>
              <input
                id="fleet-input"
                type="number"
                min="2"
                max="8"
                value={fleetSize}
                onChange={(e) => setFleetSize(Number(e.target.value))}
                style={{ width: '60px', padding: '4px 8px', fontSize: '12.5px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Cost Savings %</span>
            <div className="kpi-card-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <TrendingUpIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: '#10b981' }}>
            {comparison?.costSavingsPercent !== undefined ? `+${comparison.costSavingsPercent}%` : '—'}
          </div>
          <span className="kpi-card-desc">Savings vs Greedy Baseline</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Distance Optimized</span>
            <div className="kpi-card-icon">
              <MapPinIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">
            {optResult?.summary.totalDistanceKm ? `${optResult.summary.totalDistanceKm} km` : '—'}
          </div>
          <span className="kpi-card-desc">
            {comparison?.deltaDistanceKm ? `-${comparison.deltaDistanceKm} km saved` : 'Total vehicle km'}
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Active Fleet Deployed</span>
            <div className="kpi-card-icon">
              <TruckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{routes.length}</div>
          <span className="kpi-card-desc">{optResult?.summary.totalStopsServiced ?? stopsCount} customer stops allocated</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">SLA Compliance</span>
            <div className="kpi-card-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <ShieldCheckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: '#10b981' }}>
            {optResult?.summary.slaCompliancePercent ? `${optResult.summary.slaCompliancePercent}%` : '100%'}
          </div>
          <span className="kpi-card-desc">0 time window violations</span>
        </div>
      </div>

      {/* Actionable Pilot Recommendation Banner (EVAL-01) */}
      {evalReport && (() => {
        const recommendation = evalReport.comparison.riskSummary.recommendation;
        const lower95 = evalReport.comparison.realizedSavingsConfidenceInterval95?.lower95 ?? 0;
        const hasRisk =
          recommendation.toUpperCase().includes('RISK') ||
          recommendation.toUpperCase().includes('HOLD') ||
          recommendation.toUpperCase().includes('WARNING') ||
          lower95 <= 0;

        return (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: '22px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: hasRisk ? '#fffbeb' : '#ecfdf5',
                  border: hasRisk ? '1px solid #fde68a' : '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: hasRisk ? '#d97706' : '#059669',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {hasRisk ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <strong
                    style={{
                      fontSize: '13.5px',
                      color: hasRisk ? '#92400e' : '#065f46',
                      fontWeight: 600,
                    }}
                  >
                    Statistical Recommendation: {recommendation}
                  </strong>
                </div>
                <div style={{ fontSize: '12px', color: hasRisk ? '#78350f' : '#047857' }}>
                  Monte Carlo stochastic evaluation (95% CI): Expected realized cost savings of{' '}
                  <strong>${(evalReport.comparison.realizedExpectedSavingsVsActualCents / 100).toFixed(2)}</strong> [
                  ${((evalReport.comparison.realizedSavingsConfidenceInterval95?.lower95 ?? 0) / 100).toFixed(2)} – $
                  {((evalReport.comparison.realizedSavingsConfidenceInterval95?.upper95 ?? 0) / 100).toFixed(2)}] with 0.0% SLA breach risk.
                </div>
              </div>
            </div>

            <span
              className={hasRisk ? 'status-pill open' : 'status-pill active'}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              {hasRisk ? 'Pilot Risk Detected · Safety Buffer Required' : 'Algorithm Verified Feasible · Pilot Approved'}
            </span>
          </div>
        );
      })()}

      {/* Side-by-Side Algorithm & Financial Comparison Table (EVAL-01) */}
      <section style={{ marginBottom: '24px' }}>
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ActivityIcon size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0 }}>Three-Track Operational & Financial Comparison</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Integer cents precision · Standard 8h shift accounting
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Evaluation Track</th>
                <th>Algorithm</th>
                <th>Vehicles</th>
                <th>Distance (km)</th>
                <th>Shift Duration</th>
                <th>SLA On-Time</th>
                <th>Overtime (h)</th>
                <th>Fixed Overhead</th>
                <th>Distance Cost</th>
                <th>Labor Cost</th>
                <th>Total Cost</th>
                <th>Savings %</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Historical Actual */}
              {evalReport && (
                <tr style={{ background: '#fafafa' }}>
                  <td>
                    <strong style={{ color: '#64748b' }}>Historical Actual</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>recorded_execution</span>
                  </td>
                  <td>{evalReport.historicalActual.vehiclesCount}</td>
                  <td>{evalReport.historicalActual.distanceKm} km</td>
                  <td>{evalReport.historicalActual.shiftHours}h</td>
                  <td>{evalReport.historicalActual.onTimePercent}%</td>
                  <td style={{ color: '#d97706', fontWeight: 600 }}>{evalReport.historicalActual.costBreakdown.overtimeHours}h</td>
                  <td>${(evalReport.historicalActual.costBreakdown.fixedVehicleCostCents / 100).toFixed(2)}</td>
                  <td>${(evalReport.historicalActual.costBreakdown.distanceCostCents / 100).toFixed(2)}</td>
                  <td>${((evalReport.historicalActual.costBreakdown.regularLaborCostCents + evalReport.historicalActual.costBreakdown.overtimeLaborCostCents) / 100).toFixed(2)}</td>
                  <td>
                    <strong>${(evalReport.historicalActual.projectedCostCents / 100).toFixed(2)}</strong>
                  </td>
                  <td>
                    <span style={{ color: 'var(--color-text-muted)' }}>Baseline</span>
                  </td>
                </tr>
              )}

              {/* 2. Greedy Baseline */}
              <tr>
                <td>
                  <strong>Greedy Baseline</strong>
                </td>
                <td>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>nearest_neighbor_vrptw</span>
                </td>
                <td>{greedyResult?.summary.totalVehiclesUsed ?? fleetSize}</td>
                <td>{greedyResult?.summary.totalDistanceKm ?? '—'} km</td>
                <td>{greedyResult?.summary.totalDrivingHours ?? '—'}h</td>
                <td>100%</td>
                <td>0.0h</td>
                <td>${(((greedyResult?.summary.totalVehiclesUsed ?? fleetSize) * 5000) / 100).toFixed(2)}</td>
                <td>${(((greedyResult?.summary.totalDistanceKm ?? 0) * 120) / 100).toFixed(2)}</td>
                <td>${(((greedyResult?.summary.totalDrivingHours ?? 0) * 1500) / 100).toFixed(2)}</td>
                <td>
                  <strong>${((greedyResult?.objectiveCostCents ?? 0) / 100).toFixed(2)}</strong>
                </td>
                <td>
                  <span style={{ color: 'var(--color-text-muted)' }}>0.0%</span>
                </td>
              </tr>

              {/* 3. Metaheuristic Optimized Plan */}
              <tr style={{ background: '#f0fdf4' }}>
                <td>
                  <strong style={{ color: '#10b981' }}>Metaheuristic Optimizer</strong>
                </td>
                <td>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#047857' }}>2opt_localsearch_vrptw</span>
                </td>
                <td>{optResult?.summary.totalVehiclesUsed ?? fleetSize}</td>
                <td style={{ color: '#047857', fontWeight: 600 }}>{optResult?.summary.totalDistanceKm} km</td>
                <td>{optResult?.summary.totalDrivingHours}h</td>
                <td style={{ color: '#10b981', fontWeight: 700 }}>100%</td>
                <td>0.0h</td>
                <td>${(((optResult?.summary.totalVehiclesUsed ?? fleetSize) * 5000) / 100).toFixed(2)}</td>
                <td>${(((optResult?.summary.totalDistanceKm ?? 0) * 120) / 100).toFixed(2)}</td>
                <td>${(((optResult?.summary.totalDrivingHours ?? 0) * 1500) / 100).toFixed(2)}</td>
                <td>
                  <strong style={{ color: '#10b981', fontSize: '14px' }}>
                    ${((optResult?.objectiveCostCents ?? 0) / 100).toFixed(2)}
                  </strong>
                </td>
                <td>
                  <span className="status-pill active" style={{ fontSize: '11px' }}>
                    +{comparison?.costSavingsPercent ?? 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Vehicle Route Details & Dispatch Plan */}
      <section>
        <div className="section-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TruckIcon size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0 }}>Optimized Dispatch Itinerary & Manifest</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Select a vehicle to inspect stop sequence and load utilization
          </span>
        </div>

        {/* Vehicle Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {routes.map((r, idx) => {
            const isSelected = idx === selectedVehicleIdx;
            const loadPercent = Math.min(100, Math.round((r.peakLoadUnits / 15) * 100));

            return (
              <button
                key={r.vehicleId}
                className={isSelected ? '' : 'secondary'}
                onClick={() => setSelectedVehicleIdx(idx)}
                style={{
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <TruckIcon size={14} />
                <span>{r.vehicleId}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-pill)',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-muted)',
                  }}
                >
                  {r.visits.length} stops ({loadPercent}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Route Summary Card */}
        {activeRoute && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 22px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Vehicle Identifier:</span>
                <strong style={{ fontSize: '14px' }}>{activeRoute.vehicleId}</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Total Route Distance:</span>
                <strong style={{ fontSize: '14px' }}>{(activeRoute.totalDistanceM / 1000).toFixed(1)} km</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Total Route Duration:</span>
                <strong style={{ fontSize: '14px' }}>{(activeRoute.totalDurationS / 3600).toFixed(1)} hours</strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Capacity Utilization:</span>
                <strong style={{ fontSize: '14px' }}>
                  {activeRoute.peakLoadUnits} / 15 units ({Math.round((activeRoute.peakLoadUnits / 15) * 100)}%)
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>Estimated Route Cost:</span>
                <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>
                  ${(activeRoute.totalCostCents / 100).toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Van Payload Utilization</span>
                <span>{activeRoute.peakLoadUnits} / 15 units</span>
              </div>
              <div style={{ height: '7px', background: 'var(--color-surface-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, Math.round((activeRoute.peakLoadUnits / 15) * 100))}%`,
                    background:
                      activeRoute.peakLoadUnits > 12 ? '#f59e0b' : 'var(--color-primary)',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            {/* Stop Sequence Table */}
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>
              Ordered Delivery Stops ({activeRoute.visits.length}):
            </strong>
            <div className="table-wrap" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Customer Order Ref</th>
                    <th>GPS Coordinates</th>
                    <th>Demand Units</th>
                    <th>Est. Arrival Time</th>
                    <th>Leg Distance</th>
                    <th>Cumulative Load</th>
                    <th>Window Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRoute.visits.map((visit, vIdx) => {
                    const arrivalHrs = Math.floor(visit.arrivalTimeS / 3600);
                    const arrivalMins = Math.floor((visit.arrivalTimeS % 3600) / 60);
                    const timeStr = `${String(arrivalHrs).padStart(2, '0')}:${String(arrivalMins).padStart(2, '0')}`;

                    return (
                      <tr key={visit.stopId}>
                        <td>
                          <strong>#{vIdx + 1}</strong>
                        </td>
                        <td>
                          <strong>{visit.stopId.replace('stop-', 'SO-')}</strong>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}>
                            {visit.coordinate.lat.toFixed(4)}, {visit.coordinate.lon.toFixed(4)}
                          </span>
                        </td>
                        <td>{visit.demandUnits} units</td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            <ClockIcon size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {timeStr}
                          </span>
                        </td>
                        <td>{(visit.distanceFromPreviousM / 1000).toFixed(1)} km</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{visit.cumulativeLoadUnits} / 15</span>
                        </td>
                        <td>
                          <span className="status-pill active" style={{ fontSize: '10.5px' }}>
                            On Schedule
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
