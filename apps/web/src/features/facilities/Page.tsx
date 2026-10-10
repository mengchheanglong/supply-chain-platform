import { useState, type FormEvent } from 'react';
import { ApiError } from '@supply-chain/api-client';
import type { CreateFacility } from '@supply-chain/contracts';
import { useSession } from '../../app/session';
import { Register } from '../../shared/Register';
import { useRecords, useCreate } from './queries';
import { WarehouseIcon } from '../../shared/icons';

export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors.at(-1)!;
  const rows = useRecords(session, cursor);
  const create = useCreate(session);
  const items = rows.isError ? [] : rows.data?.items ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await create.mutateAsync({
        ...data,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
      } as CreateFacility);
      if (!session!.controller.signal.aborted) form.reset();
    } catch {
      /* Mutation error remains visible; no optimistic record. */
    }
  }

  return (
    <>
      <Register
        title="Facility register"
        count={items.length}
        loading={rows.isFetching}
        error={rows.isError ? rows.error.message : ''}
        hasNext={!rows.isError && !!rows.data?.nextCursor}
        hasPrevious={cursors.length > 1}
        onNext={() => {
          if (rows.data?.nextCursor) setCursors([...cursors, rows.data.nextCursor]);
        }}
        onPrevious={() => setCursors(cursors.slice(0, -1))}
        onRefresh={() => {
          create.reset();
          void rows.refetch();
        }}
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code / name</th>
                <th>Type / timezone</th>
                <th>Location (degrees)</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.code}</strong>
                    <span>{row.name}</span>
                  </td>
                  <td>
                    <span className="status-pill active" style={{ textTransform: 'capitalize' }}>
                      {row.kind}
                    </span>
                    <span>{row.timezone}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                      {row.latitude}, {row.longitude}
                    </span>
                    <span>{row.locationSource}</span>
                  </td>
                  <td>
                    {row.sourceSystem}
                    <span>{row.externalId}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Register>

      {session.actor.role === 'operator' && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <WarehouseIcon size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ margin: 0 }}>Create facility</h2>
          </div>
          {create.isError && (
            <div role="alert" className="error">
              {create.error.message}
              {create.error instanceof ApiError && [400, 401, 403, 409, 413].includes(create.error.status)
                ? ''
                : ' Write was not confirmed; refresh before retrying.'}
            </div>
          )}
          <form className="record-form" onSubmit={submit}>
            <label>
              Code
              <input name="code" required maxLength={64} placeholder="e.g. HUB-PP-01" />
            </label>
            <label>
              Name
              <input name="name" required maxLength={160} placeholder="e.g. Phnom Penh Central DC" />
            </label>
            <label>
              Facility type
              <select name="kind">
                <option value="warehouse">Warehouse</option>
                <option value="depot">Depot</option>
              </select>
            </label>
            <label>
              Business timezone
              <input name="timezone" required placeholder="Asia/Phnom_Penh" defaultValue="Asia/Phnom_Penh" />
            </label>
            <label>
              Latitude (degrees)
              <input name="latitude" type="number" step="any" min="-90" max="90" required placeholder="11.5564" />
            </label>
            <label>
              Longitude (degrees)
              <input name="longitude" type="number" step="any" min="-180" max="180" required placeholder="104.9282" />
            </label>
            <label>
              Location source
              <select name="locationSource">
                <option value="imported">Imported</option>
                <option value="surveyed">Surveyed</option>
                <option value="estimated">Estimated</option>
              </select>
            </label>
            <label>
              Source system
              <input name="sourceSystem" required maxLength={80} placeholder="e.g. wms-primary" />
            </label>
            <label>
              External ID
              <input name="externalId" required maxLength={160} placeholder="e.g. EXT-FAC-001" />
            </label>
            <div className="form-action">
              <button disabled={create.isPending}>
                {create.isPending ? 'Saving...' : 'Create record'}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
