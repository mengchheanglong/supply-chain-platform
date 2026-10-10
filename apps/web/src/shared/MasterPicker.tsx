import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { Unit } from '@supply-chain/contracts';
import { recordKey, sessionSignal, type Session } from '../app/session';
export function MasterPicker({session,kind,value,disabled,onSelect}:{session:Session;kind:'facilities' | 'skus';value:string;disabled:boolean;onSelect(id:string,unit?:Unit):void}) {
  const [cursors,setCursors]=useState<(string|null)[]>([null]),cursor=cursors.at(-1)!;
  const list=useQuery({queryKey:recordKey(session,kind,cursor),queryFn:({signal})=>api(kind==='facilities'?'/api/v1/facilities':'/api/v1/skus','get',{token:session.credential,signal:sessionSignal(session,signal),query:{limit:50,cursor:cursor??undefined}})});
  const rows=list.isError?[]:list.data?.items??[];
  return (
    <div style={{ width: '100%' }}>
      <label>
        {kind === 'facilities' ? 'Facility' : 'SKU'}
        <select
          value={value}
          disabled={disabled || list.isFetching || list.isError}
          onChange={(event) => {
            const row = rows.find((r) => r.id === event.target.value);
            onSelect(event.target.value, row && 'unit' in row ? row.unit : undefined);
          }}
        >
          <option value="">Select {kind === 'facilities' ? 'a facility' : 'a SKU'}</option>
          {rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} — {row.name}
            </option>
          ))}
        </select>
      </label>
      {list.isError && <p role="alert" className="error">{list.error.message}</p>}
      {(cursors.length > 1 || !!list.data?.nextCursor) && (
        <div className="pagination" style={{ marginTop: '6px' }}>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: '11px', padding: '3px 8px' }}
            disabled={disabled || list.isFetching || cursors.length === 1}
            onClick={() => {
              onSelect('');
              setCursors(cursors.slice(0, -1));
            }}
          >
            Previous {kind === 'skus' ? 'SKU' : 'facility'} page
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: '11px', padding: '3px 8px' }}
            disabled={disabled || list.isFetching || list.isError || !list.data?.nextCursor}
            onClick={() => {
              onSelect('');
              setCursors([...cursors, list.data!.nextCursor]);
            }}
          >
            Next {kind === 'skus' ? 'SKU' : 'facility'} page
          </button>
        </div>
      )}
    </div>
  );
}
