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

const mockFacility = {
  id: 'fac-1',
  tenantId: 'tenant-1',
  code: 'PNH-01',
  name: 'Phnom Penh Hub',
  kind: 'distribution_center',
  timezone: 'Asia/Phnom_Penh',
  latitude: 11.5564,
  longitude: 104.9282,
  locationSource: 'surveyed',
  sourceSystem: 'ops',
  externalId: 'ext-pnh',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockSku = {
  id: 'sku-1',
  tenantId: 'tenant-1',
  code: 'SKU-MED-01',
  name: 'Emergency Medical Kit',
  unit: 'each' as const,
  quantityPrecision: 0,
  sourceSystem: 'test',
  externalId: 'ext-sku',
  createdAt: '2026-01-01T00:00:00Z',
};

const mockOrder = {
  id: 'ord-1234567890abcdef',
  tenantId: 'tenant-1',
  facilityId: 'fac-1',
  customerReference: 'CUST-REF-99',
  sourceSystem: 'test',
  externalId: 'ext-ord',
  state: 'open' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};


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
    if (path === '/api/v1/facilities') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        items: [mockFacility],
        nextCursor: null,
      } as any;
    }
    if (path === '/api/v1/skus') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        items: [mockSku],
        nextCursor: null,
      } as any;
    }
    if (path === '/api/v1/fulfillment/orders') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        items: [mockOrder],
        nextCursor: null,
      } as any;
    }
    if (path === '/api/v1/inventory/balance') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        balance: { onHand: 150, reserved: 20, available: 130 },
      } as any;
    }
    if (path === '/api/v1/inventory/reconciliation') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        reconciled: true,
        driftDetected: false,
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

test('renders dashboard command overview with live telemetry and KPI ratios', async () => {
  setup();
  await screen.findByText('Supply Chain Command & Operations Control');
  await screen.findByText('Phnom Penh Hub');
  expect(screen.getByText('Command Overview')).toBeDefined();
  expect(screen.getByText('Order Fulfillment Velocity Funnel')).toBeDefined();
});


test('switches across Klipfolio dashboard tabs with interactive intelligence views', async () => {
  setup();
  await screen.findByText('Supply Chain Command & Operations Control');

  // Tab 2: Order Performance
  fireEvent.click(screen.getByText('Order Performance'));
  await screen.findByText('Back Order Rate');
  expect(screen.getByText('Hub Delivery Accuracy & Fulfillment Matrix')).toBeDefined();
  expect(screen.getByText('Active Demand Pipeline (1)')).toBeDefined();

  // Tab 3: Inventory Health & Cost
  fireEvent.click(screen.getByText('Inventory Health & Cost'));
  await screen.findByText('Carrying Cost of Inventory (Cost of Carry Breakdown)');
  expect(screen.getByText('ABC Inventory Velocity & Catalog Stratification')).toBeDefined();

  // Tab 4: Shipping & Logistics Status
  fireEvent.click(screen.getByText('Shipping & Logistics Status'));
  await screen.findByText('Orders Ready to Ship');
  expect(screen.getByText('Inventory Breakdown by Operational Category')).toBeDefined();
});
