import { useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@supply-chain/api-client';
import { sessionSignal, useSession } from '../../app/session';
import { MasterPicker } from '../../shared/MasterPicker';
import { useExchange, useExchangeCommand, type ExchangeCommand } from './queries';

const template = 'record_id,facility_ref,sku_ref,unit,on_hand,reserved,observed_at\nobservation-1,warehouse-A,article-A,each,10,2,2026-01-01T00:00:00Z\n';

export default function Page() {
  const { session } = useSession();
  if (!session) throw new Error('Active session required');
  const activeSession = session;
  const sessionController = session.controller;

  const [sourceSystem, setSource] = useState(''), [externalId, setExternal] = useState('');
  const [entity, setEntity] = useState<'facility' | 'sku'>('facility'), [sourceExternalId, setSourceExternal] = useState(''), [targetId, setTarget] = useState('');
  const [csv, setCsv] = useState(''), [fileName, setFileName] = useState('observations.csv');
  const [resource, setResource] = useState<'facilities' | 'skus' | 'stock'>('facilities'), [facilityId, setFacility] = useState(''), [skuId, setSku] = useState('');
  const [exportCursor, setExportCursor] = useState<string | undefined>(), [id, setId] = useState('');
  const [notes, setNotes] = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const [mappingPages, setMappingPages] = useState<(string | null)[]>([null]), [documentPages, setDocumentPages] = useState<(string | null)[]>([null]);
  const [snapshotPages, setSnapshotPages] = useState<(string | null)[]>([null]);
  const [pending, setPending] = useState<ExchangeCommand | null>(null), [localError, setError] = useState('');
  const fileGeneration = useRef(0);

  const { mappings, documents, document, snapshots, snapshot } = useExchange(
    session,
    mappingPages.at(-1)!,
    documentPages.at(-1)!,
    id,
    snapshotPages.at(-1)!,
    snapshotId
  );

  const mutation = useExchangeCommand(session, resultId => {
    setPending(null);
    setExternal('');
    if (resultId) {
      if (pending?.action === 'snapshot') {
        setSnapshotId(resultId);
      } else {
        setId(resultId);
      }
    }
  });

  const locked = !!pending, operator = session.actor.role === 'operator';
  const rejected = mutation.error instanceof ApiError && [400, 401, 403, 404, 409, 413].includes(mutation.error.status);
  const selected = document.isError || document.isFetching ? null : document.data;
  const selectedSnapshot = snapshot.isError || snapshot.isFetching ? null : snapshot.data;
  const mappingRows = mappings.isError || mappings.isFetching ? [] : mappings.data?.items ?? [];
  const documentRows = documents.isError || documents.isFetching ? [] : documents.data?.items ?? [];
  const snapshotRows = snapshots.isError || snapshots.isFetching ? [] : snapshots.data?.items ?? [];

  function source() {
    if (!sourceSystem || !externalId) {
      setError('Enter a source system and a distinct event reference.');
      return null;
    }
    return { idempotencyKey: crypto.randomUUID(), sourceSystem, externalId };
  }

  function submit(command: ExchangeCommand) {
    fileGeneration.current++;
    setError('');
    setPending(command);
    mutation.mutate(command);
  }

  function map(event: FormEvent) {
    event.preventDefault();
    const fields = source();
    if (fields) submit({ action: 'mapping', body: { ...fields, entity, sourceExternalId, targetId } });
  }

  function validate(event: FormEvent) {
    event.preventDefault();
    const fields = source();
    if (fields) submit({ action: 'import', body: { ...fields, schemaVersion: 1, fileName, csv } });
  }

  function exportPage(event: FormEvent) {
    event.preventDefault();
    const fields = source();
    if (fields) submit({ action: 'export', body: { ...fields, resource, ...(resource === 'stock' ? { facilityId, skuId } : { limit: '50', cursor: exportCursor }) } });
  }

  function createSnapshot(event: FormEvent) {
    event.preventDefault();
    const fields = source();
    if (fields) submit({ action: 'snapshot', body: { ...fields, schemaVersion: 1, notes: notes || undefined } });
  }

  async function load(file: File | undefined) {
    const generation = ++fileGeneration.current;
    if (!file) return;
    if (file.size > 40000) {
      setError('Choose a CSV file under 40 KB. Larger jobs are not supported in this slice.');
      return;
    }
    try {
      const text = await file.text();
      if (generation === fileGeneration.current && !sessionController.signal.aborted) {
        setCsv(text);
        setFileName(file.name);
        setError('');
      }
    } catch {
      setError('Could not read this file.');
    }
  }

  function download() {
    if (!selected?.csv) return;
    const url = URL.createObjectURL(new Blob([selected.csv], { type: 'text/csv;charset=utf-8' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = selected.fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadArtifact(name: string, artifactFileName: string) {
    if (!snapshotId) return;
    try {
      const art = await api('/api/v1/integrations/snapshot/artifact', 'get', {
        token: activeSession.credential,
        signal: sessionSignal(activeSession),
        query: { id: snapshotId, name }
      });
      const url = URL.createObjectURL(new Blob([art.content], { type: art.mediaType }));
      const link = window.document.createElement('a');
      link.href = url;
      link.download = artifactFileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Could not download artifact.');
    }
  }

  function refresh() {
    void mappings.refetch();
    void documents.refetch();
    void snapshots.refetch();
    if (id) void document.refetch();
    if (snapshotId) void snapshot.refetch();
  }

  return (
    <>
      <section>
        <h2>Data exchange</h2>
        <p>Validate external stock observations and export scoped operational records. Staging does not change stock, reservations or orders. These receipts are not approved planning snapshots.</p>
        <button className="secondary" disabled={locked || mappings.isFetching || documents.isFetching || document.isFetching || snapshots.isFetching || snapshot.isFetching} onClick={refresh}>
          Refresh exchange
        </button>
        {[mappings, documents, document, snapshots, snapshot].filter(query => query.isError).map((query, i) => (
          <p role="alert" className="error" key={i}>{query.error!.message}</p>
        ))}
        <div className="record-form">
          <label>Source system<input value={sourceSystem} maxLength={80} disabled={locked} onChange={event => setSource(event.target.value)} /></label>
          <label>Event reference<input value={externalId} maxLength={160} disabled={locked} onChange={event => setExternal(event.target.value)} /></label>
        </div>
        {localError && <p role="alert" className="error">{localError}</p>}
        {mutation.isError && (
          <div role="alert" className="error">
            {mutation.error.message}
            {!rejected && <p>Result is unconfirmed. Keep this page open and retry the same request. Command reference: {pending?.body.idempotencyKey}</p>}
          </div>
        )}
        {pending && (
          <div className="pagination">
            <button disabled={mutation.isPending} onClick={() => mutation.mutate(pending)}>
              {mutation.isPending ? 'Recording...' : 'Retry same request'}
            </button>
            {rejected && (
              <button className="secondary" onClick={() => { setPending(null); mutation.reset(); }}>
                Edit rejected request
              </button>
            )}
          </div>
        )}
        {mutation.isSuccess && <p role="status">Operation recorded successfully.</p>}
      </section>

      {operator && (
        <>
          <section>
            <h2>Create planning snapshot</h2>
            <p>Generate an approved, immutable point-in-time planning snapshot capturing facilities, SKUs, inventory balances, and order demand.</p>
            <form onSubmit={createSnapshot}>
              <label>Approval notes (optional)
                <input value={notes} maxLength={500} disabled={locked} onChange={event => setNotes(event.target.value)} placeholder="e.g. Approved baseline for planning" />
              </label>
              <div className="form-action">
                <button disabled={locked}>Generate approved snapshot</button>
              </div>
            </form>
            <small>Snapshots are append-only and cryptographically hashed. Operational tables are never modified.</small>
          </section>

          <section>
            <h2>Map external references</h2>
            <form className="record-form" onSubmit={map}>
              <label>Mapping type
                <select value={entity} disabled={locked} onChange={event => { setEntity(event.target.value as 'facility' | 'sku'); setTarget(''); }}>
                  <option value="facility">Facility</option>
                  <option value="sku">SKU</option>
                </select>
              </label>
              <label>External reference
                <input required maxLength={160} disabled={locked} value={sourceExternalId} onChange={event => setSourceExternal(event.target.value)} />
              </label>
              <MasterPicker key={entity} session={session} kind={entity === 'facility' ? 'facilities' : 'skus'} value={targetId} disabled={locked} onSelect={setTarget} />
              <div className="form-action"><button disabled={locked || !targetId}>Save source mapping</button></div>
            </form>
            <small>Mappings bind this source system's references to records in your organization.</small>
          </section>

          <section>
            <h2>Validate stock CSV</h2>
            <p>CSV v1 accepts up to 200 observations. Every reference needs a mapping; units and observed UTC times are required. Any issue rejects the whole file.</p>
            <form onSubmit={validate}>
              <div className="record-form">
                <label>CSV file<input type="file" accept=".csv,text/csv" disabled={locked} onChange={event => void load(event.target.files?.[0])} /></label>
                <label>File name<input required value={fileName} maxLength={160} disabled={locked} onChange={event => setFileName(event.target.value)} /></label>
              </div>
              <label>CSV content<textarea required rows={7} maxLength={40000} value={csv} disabled={locked} onChange={event => { fileGeneration.current++; setCsv(event.target.value); }} /></label>
              <div className="pagination">
                <button type="button" className="secondary" disabled={locked} onClick={() => { fileGeneration.current++; setCsv(template); }}>Use CSV template</button>
                <button disabled={locked || !csv}>Validate and stage</button>
              </div>
            </form>
            <small>For a corrected file or revalidation after mapping changes, use a new event reference. Replays return the original report.</small>
          </section>
        </>
      )}

      <section>
        <h2>Export operational CSV</h2>
        <form className="record-form" onSubmit={exportPage}>
          <label>Export resource
            <select disabled={locked} value={resource} onChange={event => { setResource(event.target.value as typeof resource); setExportCursor(undefined); }}>
              <option value="facilities">Facilities</option>
              <option value="skus">SKUs</option>
              <option value="stock">Selected stock balance</option>
            </select>
          </label>
          {resource === 'stock' && (
            <>
              <MasterPicker session={session} kind="facilities" value={facilityId} disabled={locked} onSelect={setFacility} />
              <MasterPicker session={session} kind="skus" value={skuId} disabled={locked} onSelect={setSku} />
            </>
          )}
          <div className="form-action">
            <button disabled={locked || (resource === 'stock' && (!facilityId || !skuId))}>Create export receipt</button>
          </div>
        </form>
        <p>Master-data pages contain up to 50 rows. Each receipt captures one page; several live pages do not form a point-in-time snapshot.</p>
        {exportCursor && (
          <p>Next page is selected. Enter a new event reference to export it. <button className="secondary" disabled={locked} onClick={() => setExportCursor(undefined)}>Start from first page</button></p>
        )}
      </section>

      <section>
        <h2>Approved planning snapshots</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source / event</th>
                <th>Approved at</th>
                <th>Manifest SHA-256</th>
                <th>Artifacts</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {snapshotRows.map(row => (
                <tr key={row.id}>
                  <td>{row.sourceSystem} / {row.externalId}</td>
                  <td>{row.approvedAt}</td>
                  <td title={row.manifestSha256}>{row.manifestSha256.slice(0, 12)}...</td>
                  <td>{row.artifactCount}</td>
                  <td><button disabled={locked} onClick={() => setSnapshotId(row.id)}>Open snapshot</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button disabled={locked || snapshots.isFetching || snapshotPages.length === 1} onClick={() => setSnapshotPages(snapshotPages.slice(0, -1))}>Previous snapshots</button>
          <button disabled={locked || snapshots.isFetching || snapshots.isError || !snapshots.data?.nextCursor} onClick={() => setSnapshotPages([...snapshotPages, snapshots.data!.nextCursor])}>Next snapshots</button>
        </div>
      </section>

      {selectedSnapshot && (
        <section>
          <h2>Planning snapshot · {selectedSnapshot.sourceSystem} / {selectedSnapshot.externalId}</h2>
          <p>Approved at {selectedSnapshot.approvedAt} by {selectedSnapshot.approval.approvedBy}</p>
          {selectedSnapshot.approval.notes && <p>Notes: {selectedSnapshot.approval.notes}</p>}
          <small>Manifest SHA-256: {selectedSnapshot.manifestSha256}</small><br />
          <small>Content SHA-256: {selectedSnapshot.contentSha256}</small>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Artifact</th>
                  <th>File name</th>
                  <th>Rows</th>
                  <th>Size</th>
                  <th>SHA-256</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {selectedSnapshot.artifacts.map(art => (
                  <tr key={art.name}>
                    <td>{art.name}</td>
                    <td>{art.fileName}</td>
                    <td>{art.rowCount}</td>
                    <td>{art.byteSize} B</td>
                    <td title={art.contentSha256}>{art.contentSha256.slice(0, 12)}...</td>
                    <td>
                      <button disabled={locked} onClick={() => void downloadArtifact(art.name, art.fileName)}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2>Source mappings</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source / external reference</th>
                <th>Type</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {mappingRows.map(row => (
                <tr key={row.id}>
                  <td>{row.sourceSystem} / {row.sourceExternalId}</td>
                  <td>{row.entity}</td>
                  <td>{row.targetId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button disabled={locked || mappings.isFetching || mappingPages.length === 1} onClick={() => setMappingPages(mappingPages.slice(0, -1))}>Previous mappings</button>
          <button disabled={locked || mappings.isFetching || mappings.isError || !mappings.data?.nextCursor} onClick={() => setMappingPages([...mappingPages, mappings.data!.nextCursor])}>Next mappings</button>
        </div>
      </section>

      <section>
        <h2>Exchange receipts</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source / event</th>
                <th>Type / state</th>
                <th>Accepted / total</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {documentRows.map(row => (
                <tr key={row.id}>
                  <td>{row.sourceSystem} / {row.externalId}</td>
                  <td>{row.kind} / {row.state}</td>
                  <td>{row.acceptedRows} / {row.totalRows}</td>
                  <td><button disabled={locked} onClick={() => setId(row.id)}>Open receipt</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button disabled={locked || documents.isFetching || documentPages.length === 1} onClick={() => setDocumentPages(documentPages.slice(0, -1))}>Previous receipts</button>
          <button disabled={locked || documents.isFetching || documents.isError || !documents.data?.nextCursor} onClick={() => setDocumentPages([...documentPages, documents.data!.nextCursor])}>Next receipts</button>
        </div>
      </section>

      {selected && (
        <section>
          <h2>Receipt · {selected.state}</h2>
          <p>{selected.fileName} · {selected.acceptedRows} accepted of {selected.totalRows} records · {selected.generatedAt}</p>
          <small>SHA-256: {selected.contentSha256}</small>
          {selected.csv && (
            <div className="pagination">
              <button onClick={download}>Download CSV</button>
              {selected.nextCursor && (
                <button disabled={locked} className="secondary" onClick={() => { setResource(selected.resource as 'facilities' | 'skus'); setExportCursor(selected.nextCursor!); }}>
                  Select next export page
                </button>
              )}
            </div>
          )}
          {selected.issues.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Record</th>
                    <th>Field / code</th>
                    <th>Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.issues.map((issue, index) => (
                    <tr key={index}>
                      <td>{issue.row}</td>
                      <td>{issue.field} / {issue.code}</td>
                      <td>{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selected.records.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>External facility / SKU</th>
                    <th>On hand</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Observed (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.records.map(row => (
                    <tr key={row.recordId}>
                      <td>{row.facilityRef} / {row.skuRef}</td>
                      <td>{row.onHand} {row.unit}</td>
                      <td>{row.reserved}</td>
                      <td>{row.available}</td>
                      <td>{row.observedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
