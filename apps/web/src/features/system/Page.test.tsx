import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider, useSession } from '../../app/session';
import Page from './Page';
import { api } from '@supply-chain/api-client';

vi.mock('@supply-chain/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supply-chain/api-client')>()),
  api: vi.fn(),
}));

// Mock system queries
vi.mock('./queries', () => ({
  useSystemHealth: vi.fn(() => ({
    data: {
      timestamp: '2026-10-10T00:00:00Z',
      services: [
        {
          id: 'postgres-postgis',
          name: 'PostgreSQL 18 + PostGIS 3.6',
          role: 'Operational Double-Entry Ledger & Spatial Store',
          port: 5433,
          protocol: 'TCP / PostgreSQL',
          status: 'healthy',
          latencyMs: 2,
          endpoint: '/api/health/ready',
          message: 'Transaction ledger ready',
        },
        {
          id: 'platform-api',
          name: 'Supply Chain Operations Platform',
          role: 'NestJS / Fastify Operational Master API',
          port: 8100,
          protocol: 'HTTP / JSON REST',
          status: 'healthy',
          latencyMs: 1,
          endpoint: '/api/health/live',
          message: 'API operational',
        },
        {
          id: 'osm-pathfinder',
          name: 'OSM Pathfinder Engine',
          role: 'Rust Axum Physical Road Graph & Contraction Hierarchies',
          port: 8000,
          protocol: 'HTTP / Axum',
          status: 'healthy',
          latencyMs: 3,
          endpoint: 'http://127.0.0.1:8000/api/health',
          message: 'Graph ready (5,000 nodes)',
        },
        {
          id: 'logistics-sandbox',
          name: 'Logistics Simulation Engine',
          role: 'Discrete-Event Dispatch & Virtual Fleet Engine',
          port: 8500,
          protocol: 'HTTP / Express / WS',
          status: 'healthy',
          latencyMs: 4,
          endpoint: 'http://127.0.0.1:8500/api/health',
          message: 'Clock running',
        },
      ],
      overallStatus: 'healthy',
      partitionTolerant: true,
      ledgerReconciled: true,
      isolationEnforced: true,
    },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  })),
}));

function Fixture() {
  const { session, connect } = useSession();
  return (
    <MemoryRouter>
      <button onClick={() => void connect('fixture')}>Connect</button>
      {session && <Page key={session.id} />}
    </MemoryRouter>
  );
}

function setup() {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === '/api/v1/context') {
      return {
        schemaVersion: 1,
        tenantId: 'tenant-1',
        tenantName: 'Acme Logistics',
        timezone: 'UTC',
        actorId: 'actor-1',
        role: 'operator',
      } as any;
    }
    return {} as any;
  });
  render(
    <SessionProvider>
      <Fixture />
    </SessionProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
}

afterEach(cleanup);

test('renders ecosystem service health matrix with all infrastructure nodes', async () => {
  setup();

  await waitFor(() => {
    expect(screen.getByText('Ecosystem Service Health Matrix')).toBeTruthy();
  });

  expect(screen.getByText('Ecosystem Healthy')).toBeTruthy();
  expect(screen.getByText('PostgreSQL 18 + PostGIS 3.6')).toBeTruthy();
  expect(screen.getByText('OSM Pathfinder Engine')).toBeTruthy();
  expect(screen.getByText('Logistics Simulation Engine')).toBeTruthy();
  expect(screen.getByText(/Probe Latencies/)).toBeTruthy();
});
