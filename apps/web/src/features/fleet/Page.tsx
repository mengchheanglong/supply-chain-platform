import { useState } from 'react';
import { useSession } from '../../app/session';
import { useFleetSimulation, useSimulationControls } from './queries';
import type { SandboxVehicle } from './types';
import {
  TruckIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  ZapIcon,
  MapPinIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ActivityIcon,
} from '../../shared/icons';

const SANDBOX_UI_URL = ((import.meta as any).env?.VITE_SANDBOX_UI_URL as string) || 'http://127.0.0.1:5173';


export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<SandboxVehicle | null>(null);

  const fleetQuery = useFleetSimulation(4000);
  const controls = useSimulationControls();

  const data = fleetQuery.data;
  const isAvailable = Boolean(data?.isAvailable);
  const simState = data?.state;
  const simStats = data?.stats;
  const vehicles = data?.vehicles ?? [];

  const isPaused = simState?.clock.paused ?? false;
  const currentSpeed = simState?.clock.speed ?? 1;

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesFilter =
      statusFilter === 'all' || v.status.toLowerCase() === statusFilter.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      v.id.toLowerCase().includes(query) ||
      (v.driverName && v.driverName.toLowerCase().includes(query)) ||
      (v.driverId && v.driverId.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  });

  const enRouteCount = vehicles.filter((v) => v.status === 'en_route').length;
  const idleCount = vehicles.filter((v) => v.status === 'idle').length;
  const returningCount = vehicles.filter((v) => v.status === 'returning').length;

  return (
    <>
      {/* AGENTS.md Operational Boundary Banner */}
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
        <ActivityIcon size={18} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--color-text-main)' }}>
          <strong>Operational Boundary Isolation (AGENTS.md):</strong> Telemetry and vehicle coordinates shown here are generated in-memory by the discrete-event simulation engine (Port 3001). Simulation workers hold zero write authority to the operational database. Verified shipment transitions and inventory reserves remain strictly separated in PostgreSQL PostGIS.
        </div>
      </div>

      {!isAvailable && (
        <div role="alert" className="error" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <strong>Logistics Sandbox Offline</strong>
          </div>
          <span>
            {data?.errorMessage ||
              'Unable to connect to the logistics sandbox on port 3001. Ensure Workspace services are running.'}
          </span>
        </div>
      )}

      {/* Control Strip & Visualizer Link */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span
            className={'status-pill ' + (isAvailable && !isPaused ? 'active' : isPaused ? 'open' : 'cancelled')}
            style={{ fontWeight: 600, fontSize: '12px' }}
          >
            {isAvailable ? (
              isPaused ? (
                <>
                  <PauseIcon size={12} /> Simulation Paused
                </>
              ) : (
                <>
                  <PlayIcon size={12} /> Simulation Running ({currentSpeed}x)
                </>
              )
            ) : (
              <>
                <AlertCircleIcon size={12} /> Engine Offline
              </>
            )}
          </span>

          {/* Play/Pause Button */}
          <button
            className="secondary"
            disabled={!isAvailable || controls.togglePause.isPending}
            onClick={() => controls.togglePause.mutate(!isPaused)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            {isPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
            <span>{isPaused ? 'Resume Clock' : 'Pause Clock'}</span>
          </button>

          {/* Speed Presets */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '4px' }}>Speed:</span>
            {[1, 5, 10, 25, 50].map((s) => (
              <button
                key={s}
                className={currentSpeed === s ? '' : 'secondary'}
                disabled={!isAvailable || controls.setSpeed.isPending}
                onClick={() => controls.setSpeed.mutate(s)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="secondary"
            disabled={fleetQuery.isFetching}
            onClick={() => void fleetQuery.refetch()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <RefreshCwIcon size={14} />
            <span>Refresh</span>
          </button>

          <a
            href={SANDBOX_UI_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Launch 3D Visualizer</span>
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Virtual Fleet Size</span>
            <div className="kpi-card-icon">
              <TruckIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">{vehicles.length}</div>
          <span className="kpi-card-desc">Discrete dispatch units</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Fleet in Flight</span>
            <div className="kpi-card-icon">
              <ActivityIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--color-accent)' }}>
            {enRouteCount}
          </div>
          <span className="kpi-card-desc">{idleCount} idle · {returningCount} returning</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Road Traversed</span>
            <div className="kpi-card-icon">
              <MapPinIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">
            {simStats?.totalDistanceKm ? `${Math.round(simStats.totalDistanceKm)} km` : '—'}
          </div>
          <span className="kpi-card-desc">Physical road graph traversed</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-head">
            <span className="kpi-card-title">Completed Orders</span>
            <div className="kpi-card-icon">
              <CheckCircleIcon size={16} />
            </div>
          </div>
          <div className="kpi-card-value">
            {simStats?.completedDeliveries ?? '—'}
          </div>
          <span className="kpi-card-desc">Simulated last-mile drops</span>
        </div>
      </div>

      {/* Vehicle Roster Table & Filter Section */}
      <section style={{ marginTop: '20px' }}>
        <div className="section-head">
          <h2>Virtual Fleet Telemetry & Roster</h2>
          <span>{filteredVehicles.length} vehicles matching criteria</span>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            margin: '12px 0',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Vehicles' },
              { id: 'en_route', label: 'En Route' },
              { id: 'idle', label: 'Idle at Depot' },
              { id: 'returning', label: 'Returning' },
              { id: 'broken_down', label: 'Incident / Hazard' },
            ].map((tab) => (
              <button
                key={tab.id}
                className={statusFilter === tab.id ? '' : 'secondary'}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search vehicle or driver ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '6px 12px', fontSize: '12px' }}
            />
          </div>
        </div>

        {/* Table Wrap */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle ID / Type</th>
                <th>Status</th>
                <th>Battery Level</th>
                <th>Current Speed</th>
                <th>Coordinates (Lat, Lng)</th>
                <th>Depot / Assignment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                    {isAvailable ? 'No vehicles found matching current filters.' : 'Logistics Sandbox is offline.'}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const lat = v.position.lat;
                  const lng = v.position.lng ?? v.position.lon ?? 0;
                  const isSelected = selectedVehicle?.id === v.id;

                  return (
                    <tr
                      key={v.id}
                      style={{
                        backgroundColor: isSelected ? 'var(--color-primary-light)' : undefined,
                      }}
                    >
                      <td>
                        <strong>{v.id}</strong>
                        <span style={{ textTransform: 'capitalize' }}>{v.type || 'Standard Van'}</span>
                      </td>

                      <td>
                        <span
                          className={
                            'status-pill ' +
                            (v.status === 'en_route'
                              ? 'active'
                              : v.status === 'idle'
                                ? 'pending'
                                : v.status === 'broken_down'
                                  ? 'cancelled'
                                  : 'open')
                          }
                        >
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ZapIcon
                            size={14}
                            style={{
                              color:
                                (v.battery ?? 100) > 40
                                  ? 'var(--color-success-text)'
                                  : 'var(--color-error-dot)',
                            }}
                          />
                          <span>{v.battery !== undefined ? `${v.battery}%` : '85%'}</span>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {v.speed_kmh !== undefined ? `${Math.round(v.speed_kmh)} km/h` : '0 km/h'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                          {lat.toFixed(4)}, {lng.toFixed(4)}
                        </span>
                      </td>

                      <td>
                        <span>{v.assignedDepotId || 'Phnom Penh Main Hub'}</span>
                      </td>

                      <td>
                        <button
                          className="secondary"
                          onClick={() => setSelectedVehicle(isSelected ? null : v)}
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          {isSelected ? 'Close' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Selected Vehicle Drawer Card */}
      {selectedVehicle && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TruckIcon size={18} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                Vehicle Inspection: {selectedVehicle.id}
              </h3>
            </div>
            <button
              className="secondary"
              onClick={() => setSelectedVehicle(null)}
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Dismiss
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '12.5px',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Vehicle Status:</span>
              <strong style={{ textTransform: 'capitalize' }}>{selectedVehicle.status.replace(/_/g, ' ')}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Assigned Driver:</span>
              <strong>{selectedVehicle.driverName || selectedVehicle.driverId || 'Driver-01'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>GPS Coordinates:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>
                {selectedVehicle.position.lat.toFixed(5)}, {(selectedVehicle.position.lng ?? selectedVehicle.position.lon ?? 0).toFixed(5)}
              </strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Current Speed:</span>
              <strong>{selectedVehicle.speed_kmh ? `${Math.round(selectedVehicle.speed_kmh)} km/h` : '0 km/h'}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Battery Reserve:</span>
              <strong>{selectedVehicle.battery ?? 85}%</strong>
            </div>

            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Home Facility / Depot:</span>
              <strong>{selectedVehicle.assignedDepotId || 'Phnom Penh Hub'}</strong>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
