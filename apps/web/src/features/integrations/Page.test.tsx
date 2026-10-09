import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@supply-chain/api-client';
import { SessionProvider, useSession } from '../../app/session';
import Page from './Page';

vi.mock('@supply-chain/api-client', async importOriginal => ({
  ...await importOriginal<typeof import('@supply-chain/api-client')>(),
  api: vi.fn()
}));

function Fixture() {
  const { session, connect, disconnect } = useSession();
  return (
    <>
      <button onClick={() => void connect('fixture')}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      {session && <Page key={session.id} />}
    </>
  );
}

const report = {
  id: 'doc',
  state: 'rejected',
  kind: 'import',
  resource: 'stock-observations',
  fileName: 'observations.csv',
  acceptedRows: 0,
  totalRows: 1,
  contentSha256: 'a'.repeat(64),
  generatedAt: '2026-01-01T00:00:00Z',
  issues: [{ row: 2, field: 'unit', code: 'UNIT', message: 'An explicit supported unit is required' }],
  records: [],
  csv: null,
  nextCursor: null
};

const snapshotMock = {
  schemaVersion: 1,
  manifestVersion: 1,
  source: 'operational',
  tenantId: 'tenant',
  id: 'snap-1',
  idempotencyKey: 'idem-1',
  actorId: 'actor',
  sourceSystem: 'planning-svc',
  externalId: 'snap-ext-1',
  generatedAt: '2026-01-01T00:00:00Z',
  approvedAt: '2026-01-01T00:00:00Z',
  approval: { approvedBy: 'actor', approvedAt: '2026-01-01T00:00:00Z', notes: 'Baseline snapshot' },
  planningApproved: true,
  manifestSha256: 'b'.repeat(64),
  contentSha256: 'c'.repeat(64),
  artifacts: [
    { name: 'facilities.csv', fileName: 'facilities.csv', mediaType: 'text/csv; charset=utf-8', contentSha256: 'd'.repeat(64), rowCount: 1, byteSize: 42 }
  ],
  lineage: { generatedAt: '2026-01-01T00:00:00Z', cutoffAt: '2026-01-01T00:00:00Z', tenantId: 'tenant', actorId: 'actor', sourceSystem: 'planning-svc', externalId: 'snap-ext-1' }
};

let failWrite = true, failRead = false;
const posts: any[] = [];

async function setup(role = 'operator', initialSnapshots = false) {
  failWrite = true;
  failRead = false;
  posts.length = 0;
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(async (path, method, options) => {
    if (path === '/api/v1/context') return { schemaVersion: 1, tenantId: 'tenant', tenantName: 'Test', timezone: 'UTC', actorId: 'actor', role } as any;
    if (method === 'post') {
      posts.push(options?.body);
      if (failWrite) throw new Error('Connection lost');
      if (path === '/api/v1/integrations/snapshots') return snapshotMock as any;
      return report as any;
    }
    if (failRead) throw new Error('Persistence unavailable');
    if (path === '/api/v1/integrations/document') return report as any;
    if (path === '/api/v1/integrations/snapshots') {
      return {
        items: initialSnapshots ? [{
          id: 'snap-1',
          sourceSystem: 'planning-svc',
          externalId: 'snap-ext-1',
          generatedAt: '2026-01-01T00:00:00Z',
          approvedAt: '2026-01-01T00:00:00Z',
          manifestSha256: 'b'.repeat(64),
          contentSha256: 'c'.repeat(64),
          planningApproved: true,
          artifactCount: 1
        }] : [],
        nextCursor: null
      } as any;
    }
    if (path === '/api/v1/integrations/snapshot') return snapshotMock as any;
    if (path === '/api/v1/integrations/snapshot/artifact') {
      return {
        name: 'facilities.csv',
        fileName: 'facilities.csv',
        mediaType: 'text/csv; charset=utf-8',
        contentSha256: 'd'.repeat(64),
        rowCount: 1,
        byteSize: 42,
        content: 'facility_id,code\nfac-1,FAC-1\n'
      } as any;
    }
    return { items: [], nextCursor: null } as any;
  });
  render(<SessionProvider><Fixture /></SessionProvider>);
  fireEvent.click(screen.getByText('Connect'));
  await screen.findByText('Data exchange');
}

afterEach(cleanup);

test('unconfirmed CSV validation keeps exact bytes and key; a recorded rejection remains a quality report', async () => {
  await setup();
  fireEvent.change(screen.getByLabelText('Source system'), { target: { value: 'erp' } });
  fireEvent.change(screen.getByLabelText('Event reference'), { target: { value: 'file-v1' } });
  fireEvent.change(screen.getByLabelText('CSV content'), { target: { value: 'unit\n' } });
  fireEvent.click(screen.getByText('Validate and stage'));
  await screen.findByRole('alert');
  expect(posts).toHaveLength(1);
  expect((screen.getByLabelText('CSV content') as HTMLTextAreaElement).disabled).toBe(true);
  const original = posts[0];
  failWrite = false;
  fireEvent.click(screen.getByText('Retry same request'));
  await screen.findByText('Receipt · rejected');
  expect(posts[1]).toEqual(original);
  expect(screen.getByText('An explicit supported unit is required')).toBeTruthy();
  expect(screen.getByText(/0 accepted of 1 records/)).toBeTruthy();
  expect((screen.getByLabelText('CSV content') as HTMLTextAreaElement).disabled).toBe(false);
});

test('failed refresh hides reports and disconnect clears CSV and receipt state', async () => {
  await setup();
  failWrite = false;
  fireEvent.change(screen.getByLabelText('Source system'), { target: { value: 'erp' } });
  fireEvent.change(screen.getByLabelText('Event reference'), { target: { value: 'file-v2' } });
  fireEvent.change(screen.getByLabelText('CSV content'), { target: { value: 'unit\n' } });
  fireEvent.click(screen.getByText('Validate and stage'));
  await screen.findByText('Receipt · rejected');
  failRead = true;
  fireEvent.click(screen.getByText('Refresh exchange'));
  await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
  expect(screen.queryByText('Receipt · rejected')).toBeNull();
  fireEvent.click(screen.getByText('Disconnect'));
  expect(screen.queryByText('CSV content')).toBeNull();
  expect(screen.queryByText('Exchange receipts')).toBeNull();
});

test('reader sees export controls and snapshots but no creation controls', async () => {
  await setup('reader', true);
  await screen.findByText('planning-svc / snap-ext-1');
  expect(screen.getByText('Create export receipt')).toBeTruthy();
  expect(screen.getByText('Approved planning snapshots')).toBeTruthy();
  expect(screen.queryByText('Save source mapping')).toBeNull();
  expect(screen.queryByText('Validate and stage')).toBeNull();
  expect(screen.queryByText('Generate approved snapshot')).toBeNull();
});

test('operator can generate snapshot and inspect manifest with artifact downloads', async () => {
  await setup('operator', true);
  const openBtn = await screen.findByText('Open snapshot');
  fireEvent.click(openBtn);
  await screen.findByText(/Planning snapshot · planning-svc \/ snap-ext-1/);
  expect(screen.getAllByText('facilities.csv').length).toBe(2);
  expect(screen.getByText('Notes: Baseline snapshot')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();

  failWrite = false;
  fireEvent.change(screen.getByLabelText('Source system'), { target: { value: 'sim-engine' } });
  fireEvent.change(screen.getByLabelText('Event reference'), { target: { value: 'run-42' } });
  fireEvent.change(screen.getByPlaceholderText('e.g. Approved baseline for planning'), { target: { value: 'Simulation seed run' } });
  fireEvent.click(screen.getByText('Generate approved snapshot'));
  await screen.findByText('Operation recorded successfully.');
  expect(posts[0]).toEqual({
    idempotencyKey: expect.any(String),
    sourceSystem: 'sim-engine',
    externalId: 'run-42',
    schemaVersion: 1,
    notes: 'Simulation seed run'
  });
});
