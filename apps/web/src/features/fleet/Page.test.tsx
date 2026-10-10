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

// Mock fleet queries
vi.mock('./queries', () => ({
  useFleetSimulation: vi.fn(() => ({
    data: {
      state: {
        status: 'running',
        simTime: 123456,
        clock: { speed: 10, paused: false },
      },
      stats: {
        totalDistanceKm: 1240,
        activeVehicles: 8,
        completedDeliveries: 42,
        pendingOrders: 15,
      },
      vehicles: [
        {
          id: 'VEH-001',
          type: 'van',
          status: 'en_route',
          driverId: 'DRV-101',
          battery: 88,
          speed_kmh: 34,
          position: { lat: 11.5564, lng: 104.9282 },
          assignedDepotId: 'PNH-01',
        },
        {
          id: 'VEH-002',
          type: 'truck',
          status: 'idle',
          driverId: 'DRV-102',
          battery: 95,
          speed_kmh: 0,
          position: { lat: 11.558, lng: 104.925 },
          assignedDepotId: 'PNH-01',
        },
      ],
      isAvailable: true,
    },
    isFetching: false,
    refetch: vi.fn(),
  })),
  useSimulationControls: vi.fn(() => ({
    togglePause: { mutate: vi.fn(), isPending: false },
    setSpeed: { mutate: vi.fn(), isPending: false },
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

test('renders virtual fleet roster with simulation status and boundary notice', async () => {
  setup();

  await waitFor(() => {
    expect(screen.getByText(/Operational Boundary Isolation/)).toBeTruthy();
  });

  expect(screen.getByText(/Simulation Running/)).toBeTruthy();
  expect(screen.getByText('VEH-001')).toBeTruthy();
  expect(screen.getByText('VEH-002')).toBeTruthy();
  expect(screen.getByText(/Launch 3D Visualizer/)).toBeTruthy();
});

test('allows inspecting a vehicle', async () => {
  setup();

  await waitFor(() => {
    expect(screen.getByText('VEH-001')).toBeTruthy();
  });

  const inspectButtons = screen.getAllByRole('button', { name: 'Inspect' });
  fireEvent.click(inspectButtons[0]);

  await waitFor(() => {
    expect(screen.getByText('Vehicle Inspection: VEH-001')).toBeTruthy();
  });
});
