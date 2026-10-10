import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  kind: 'distribution_center' as const,
  timezone: 'Asia/Phnom_Penh',
  latitude: 11.5564,
  longitude: 104.9282,
  locationSource: 'surveyed' as const,
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

const mockOrderDetail = {
  ...mockOrder,
  lines: [
    {
      id: 'line-1',
      orderId: mockOrder.id,
      skuId: mockSku.id,
      skuCode: mockSku.code,
      skuName: mockSku.name,
      unit: mockSku.unit,
      requested: '10',
      allocated: '0',
      remaining: '10',
      shipped: '0',
      quantityPrecision: 0,
    },
  ],
};

function setup() {
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(async (path, method) => {
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
    if (path === '/api/v1/fulfillment/order') {
      return mockOrderDetail as any;
    }
    if (path === '/api/v1/inventory/balance') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        stock: {
          tenantId: 'tenant-1',
          facilityId: mockFacility.id,
          skuId: mockSku.id,
          unit: 'each',
          onHand: '150',
          reserved: '20',
          available: '130',
          quantityPrecision: 0,
        },
      } as any;
    }
    if (path === '/api/v1/inventory/reconciliation') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        facilityId: mockFacility.id,
        skuId: mockSku.id,
        unit: 'each',
        consistent: true,
        onHand: '150',
        activeReserved: '20',
        reserved: '20',
        ledgerOnHand: '150',
        quantityPrecision: 0,
      } as any;
    }
    if (path === '/api/v1/inventory/receive' && method === 'post') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        movementId: 'mov-1',
      } as any;
    }
    if (path === '/api/v1/fulfillment/allocate' && method === 'post') {
      return {
        schemaVersion: 1,
        source: 'operational',
        tenantId: 'tenant-1',
        generatedAt: '2026-01-01T00:00:00Z',
        allocationId: 'alc-1',
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

test('renders operational command center with live telemetry and workbench', async () => {
  setup();
  await screen.findByText('Supply Chain Command & Operations Control');
  await screen.findByText('Phnom Penh Hub');
  await screen.findByText('Stock Inspector & Quick Ledger');
  await screen.findByText('150'); // onHand balance
});


test('interactively opens order allocation triage modal', async () => {
  setup();
  await screen.findByText('Supply Chain Command & Operations Control');

  const allocateBtn = await screen.findByText('Allocate Line');
  fireEvent.click(allocateBtn);

  await screen.findByText('Allocate Customer Order');
  expect(screen.getByText('Units to Allocate from Hub:')).toBeDefined();
});

test('submits quick inbound stock receipt to double-entry ledger', async () => {
  setup();
  await screen.findByText('Supply Chain Command & Operations Control');

  const qtyInput = screen.getByPlaceholderText('Quantity…');
  fireEvent.change(qtyInput, { target: { value: '50' } });

  const submitBtn = screen.getByText('+ Commit Inbound Stock to Ledger');
  fireEvent.click(submitBtn);

  await waitFor(() => {
    expect(
      vi.mocked(api).mock.calls.some((call) => call[0] === '/api/v1/inventory/receive' && call[1] === 'post')
    ).toBe(true);
  });
});
