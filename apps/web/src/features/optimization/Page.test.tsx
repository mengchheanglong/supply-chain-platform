import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionProvider, useSession } from '../../app/session';
import Page from './Page';
import { api } from '@supply-chain/api-client';

vi.mock('@supply-chain/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supply-chain/api-client')>()),
  api: vi.fn(),
}));

function Fixture() {
  const { session, connect, disconnect } = useSession();
  return (
    <MemoryRouter>
      <button onClick={() => void connect('fixture')}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
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
        tenantName: 'Cambodia Express Logistics',
        timezone: 'Asia/Phnom_Penh',
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
  fireEvent.click(screen.getByText('Connect'));
}

afterEach(cleanup);

test('renders route optimization & scenario intelligence cockpit', async () => {
  setup();
  await screen.findByText('VRPTW Route Optimization & Decision Intelligence');
  await screen.findByText('Three-Track Operational & Financial Comparison');
  await screen.findByText('Optimized Dispatch Itinerary & Manifest');
  expect(screen.getByText('Cost Savings %')).toBeDefined();
  expect(screen.getByText('Distance Optimized')).toBeDefined();
});

test('interactively switches vehicle dispatch tabs and inspects stop sequences', async () => {
  setup();
  await screen.findByText('VRPTW Route Optimization & Decision Intelligence');

  // Look for vehicle tab buttons
  const vehicleBtn = await screen.findByText('veh-2');
  fireEvent.click(vehicleBtn);

  // Checks that vehicle 2 details appear
  await screen.findByText('Vehicle Identifier:');
  expect(screen.getAllByText('veh-2').length).toBeGreaterThanOrEqual(2);
});

test('applies scenario presets and triggers re-optimization', async () => {
  setup();
  await screen.findByText('VRPTW Route Optimization & Decision Intelligence');

  const presetBtn = screen.getByText('Express Metro (15 stops, 4 vans)');
  fireEvent.click(presetBtn);

  expect(screen.getByDisplayValue('15')).toBeDefined();
  expect(screen.getByDisplayValue('4')).toBeDefined();
});
