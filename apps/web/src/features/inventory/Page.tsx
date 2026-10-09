import { useState, type FormEvent } from 'react';
import { ApiError } from '@supply-chain/api-client';
import type { Unit } from '@supply-chain/contracts';
import { useSession } from '../../app/session';
import { MasterPicker } from '../../shared/MasterPicker';
import { useInventory, useInventoryCommand, type InventoryCommand } from './queries';
export default function Page() {
  const {session}=useSession();if(!session)throw new Error('Active session required');
  const [facilityId,setFacility]=useState(''),[skuId,setSku]=useState(''),[unit,setUnit]=useState<Unit>('each');
  const [reservationPages,setReservationPages]=useState<(string|null)[]>([null]),[movementPages,setMovementPages]=useState<(string|null)[]>([null]);
  const [sourceSystem,setSource]=useState(''),[externalId,setExternal]=useState(''),[quantity,setQuantity]=useState(''),[action,setAction]=useState<'receive'|'reserve'>('receive');
  const [pending,setPending]=useState<InventoryCommand|null>(null),[localError,setLocalError]=useState('');
  const {balance,reconciliation,reservations,movements}=useInventory(session,facilityId,skuId,reservationPages.at(-1)!,movementPages.at(-1)!);
  const mutation=useInventoryCommand(session,()=>{setPending(null);setQuantity('');setExternal('');});
  const stock=balance.isError||balance.isFetching?null:balance.data?.stock;
  const holds=reservations.isError||reservations.isFetching?[]:reservations.data?.items??[];
  const history=movements.isError||movements.isFetching?[]:movements.data?.items??[];
  const rejected=mutation.error instanceof ApiError&&[400,401,403,404,409,413].includes(mutation.error.status);
  function selection() {setReservationPages([null]);setMovementPages([null]);mutation.reset();setLocalError('');}
  function submit(command:InventoryCommand) {setLocalError('');setPending(command);mutation.mutate(command);}
  function source() {
    if(!sourceSystem||!externalId){setLocalError('Enter a source system and source reference for this command.');return null;}
    return {idempotencyKey:crypto.randomUUID(),sourceSystem,externalId};
  }
  function receiveOrReserve(event:FormEvent) {
    event.preventDefault();const fields=source();if(fields&&facilityId&&skuId)submit({action,body:{...fields,facilityId,skuId,unit,quantity}});
  }
  function transition(action:'release'|'ship',reservationId:string) {const fields=source();if(fields)submit({action,body:{...fields,reservationId}});}
  function refresh() {void balance.refetch();void reconciliation.refetch();void reservations.refetch();void movements.refetch();}
  return <><section><h2>Inventory</h2><p>Receiving adds physical stock. Reservations allocate availability. Shipping consumes a whole active reservation once.</p>
    <div className="record-form"><MasterPicker session={session} kind="facilities" value={facilityId} disabled={!!pending} onSelect={id=>{setFacility(id);selection();}}/>
    <MasterPicker session={session} kind="skus" value={skuId} disabled={!!pending} onSelect={(id,unit)=>{setSku(id);if(unit)setUnit(unit);selection();}}/></div>
    {facilityId&&skuId&&<><button className="secondary" onClick={refresh} disabled={balance.isFetching}>Refresh inventory</button>
    {[balance,reconciliation,reservations,movements].filter(query=>query.isError).map((query,index)=><p key={index} role="alert" className="error">{query.error!.message}</p>)}
    {balance.isFetching&&<p role="status">Loading inventory...</p>}
    {stock&&<div className="stock-summary"><div><strong>{stock.onHand} {stock.unit}</strong><span>On hand</span></div><div><strong>{stock.reserved} {stock.unit}</strong><span>Reserved</span></div><div><strong>{stock.available} {stock.unit}</strong><span>Available</span></div></div>}
    {!reconciliation.isError&&!reconciliation.isFetching&&reconciliation.data&&<p role="status">{reconciliation.data.consistent?'Ledger and active reservations reconcile.':'Stock reconciliation failed. Investigate before further operations.'}</p>}
    </>}
  </section>{session.actor.role==='operator'&&facilityId&&skuId&&<section><h2>Stock command</h2>
    {localError&&<p role="alert" className="error">{localError}</p>}
    {mutation.isError&&<div role="alert" className="error">{mutation.error.message}{!rejected&&<p>Result is unconfirmed. Keep this page open and retry the same command to safely recover its result. Command reference: {pending?.body.idempotencyKey}</p>}</div>}
    {mutation.isSuccess&&<p role="status">{mutation.data.action} recorded. Refresh shows current stock; retries return the original receipt.</p>}
    {pending&&<div className="pagination"><button disabled={mutation.isPending} onClick={()=>mutation.mutate(pending)}>{mutation.isPending?'Recording...':'Retry same command'}</button>
      {rejected&&<button className="secondary" onClick={()=>{setPending(null);mutation.reset();}}>Edit rejected request</button>}</div>}
    <form className="record-form" onSubmit={receiveOrReserve}><label>Action<select disabled={!!pending} value={action} onChange={event=>setAction(event.target.value as 'receive'|'reserve')}><option value="receive">Receive stock</option><option value="reserve">Reserve stock</option></select></label>
    <label>Quantity ({unit})<input inputMode="decimal" required value={quantity} disabled={!!pending} onChange={event=>setQuantity(event.target.value)} pattern="(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?"/></label>
    <label>Source system<input required maxLength={80} value={sourceSystem} disabled={!!pending} onChange={event=>setSource(event.target.value)}/></label>
    <label>Source reference<input required maxLength={160} value={externalId} disabled={!!pending} onChange={event=>setExternal(event.target.value)} placeholder="Receipt, demand or shipment reference"/></label>
    <div className="form-action"><button disabled={!!pending||!stock||reconciliation.data?.consistent!==true}>Record {action}</button></div></form>
    <small>Use a distinct source reference for each event. Enter a shipment or release reference above before acting on an active reservation.</small>
  </section>}
  {facilityId&&skuId&&<><section><h2>Reservations</h2><div className="table-wrap"><table><thead><tr><th>Demand reference</th><th>Quantity</th><th>State</th><th>Actions</th></tr></thead><tbody>{holds.map(row=><tr key={row.id}><td>{row.sourceSystem} / {row.externalId}</td><td>{row.quantity} {row.unit}</td><td>{row.state}{row.ownerType&&' · Managed by fulfillment'}</td><td>{row.state==='active'&&!row.ownerType&&session.actor.role==='operator'&&<><button disabled={!!pending||!stock||reconciliation.data?.consistent!==true} onClick={()=>transition('release',row.id)}>Release</button> <button disabled={!!pending||!stock||reconciliation.data?.consistent!==true} onClick={()=>transition('ship',row.id)}>Confirm shipment</button></>}</td></tr>)}</tbody></table></div>
    <div className="pagination"><button disabled={reservations.isFetching||reservationPages.length===1} onClick={()=>setReservationPages(reservationPages.slice(0,-1))}>Previous reservations</button><button disabled={reservations.isError||reservations.isFetching||!reservations.data?.nextCursor} onClick={()=>setReservationPages([...reservationPages,reservations.data!.nextCursor])}>Next reservations</button></div>
  </section><section><h2>Movement ledger</h2><div className="table-wrap"><table><thead><tr><th>Event</th><th>Physical change</th><th>Source reference</th><th>Recorded (UTC)</th></tr></thead><tbody>{history.map(row=><tr key={row.id}><td>{row.action}</td><td>{row.delta} {row.unit}</td><td>{row.sourceSystem} / {row.externalId}</td><td>{row.createdAt}</td></tr>)}</tbody></table></div>
    <div className="pagination"><button disabled={movements.isFetching||movementPages.length===1} onClick={()=>setMovementPages(movementPages.slice(0,-1))}>Previous movements</button><button disabled={movements.isError||movements.isFetching||!movements.data?.nextCursor} onClick={()=>setMovementPages([...movementPages,movements.data!.nextCursor])}>Next movements</button></div>
  </section></>}
  </>;
}
