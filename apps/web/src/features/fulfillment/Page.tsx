import { useState, type FormEvent } from 'react';
import { ApiError } from '@supply-chain/api-client';
import type { OrderInput, Unit } from '@supply-chain/contracts';
import { useSession } from '../../app/session';
import { MasterPicker } from '../../shared/MasterPicker';
import { useWorkflows, useWorkflowCommand, type WorkflowCommand } from './queries';
function Pager({label,pages,setPages,next,busy}:{label:string;pages:(string|null)[];setPages:(pages:(string|null)[])=>void;next:string|null|undefined;busy:boolean}) {
 return <div className="pagination"><button disabled={busy||pages.length===1} onClick={()=>setPages(pages.slice(0,-1))}>Previous {label}</button><button disabled={busy||!next} onClick={()=>setPages([...pages,next!])}>Next {label}</button></div>;
}
export default function Page() {
 const {session}=useSession();if(!session)throw new Error('Active session required');
 const operator=session.actor.role==='operator';
 const [orderId,setOrder]=useState(''),[facilityId,setFacility]=useState(''),[customerReference,setCustomer]=useState('');
 const [skuId,setSku]=useState(''),[unit,setUnit]=useState<Unit>('each'),[quantity,setQuantity]=useState(''),[draftLines,setDraftLines]=useState<OrderInput['lines']>([]);
 const [lineId,setLine]=useState(''),[allocationQuantity,setAllocationQuantity]=useState('');
 const [sourceSystem,setSource]=useState(''),[externalId,setExternal]=useState(''),[observedAt,setObserved]=useState('');
 const [ordersPages,setOrdersPages]=useState<(string|null)[]>([null]),[allocationPages,setAllocationPages]=useState<(string|null)[]>([null]),[shipmentPages,setShipmentPages]=useState<(string|null)[]>([null]);
 const [pending,setPending]=useState<WorkflowCommand|null>(null),[localError,setLocalError]=useState('');
 const {orders,detail,allocations,shipments}=useWorkflows(session,orderId,ordersPages.at(-1)!,allocationPages.at(-1)!,shipmentPages.at(-1)!);
 function selectOrder(id:string) {setOrder(id);setLine('');setAllocationPages([null]);setShipmentPages([null]);}
 const mutation=useWorkflowCommand(session,id=>{if(pending?.action==='deliver')setObserved('');if(pending?.action==='order'){setDraftLines([]);setCustomer('');}setPending(null);setExternal('');setAllocationQuantity('');if(id!==orderId)selectOrder(id);});
 const rejected=mutation.error instanceof ApiError&&[400,401,403,404,409,413].includes(mutation.error.status);
 const locked=!!pending,loading=detail.isFetching||allocations.isFetching||shipments.isFetching;
 const current=detail.isError||detail.isFetching?null:detail.data;
 const canAct=operator&&!locked&&!loading&&!!current&&!allocations.isError&&!shipments.isError;
 const orderRows=orders.isError||orders.isFetching?[]:orders.data?.items??[],allocationRows=allocations.isError||allocations.isFetching?[]:allocations.data?.items??[],shipmentRows=shipments.isError||shipments.isFetching?[]:shipments.data?.items??[];
 function source() {if(!sourceSystem||!externalId){setLocalError('Enter a source system and source reference for this event.');return null;}return {idempotencyKey:crypto.randomUUID(),sourceSystem,externalId};}
 function submit(command:WorkflowCommand) {setLocalError('');setPending(command);mutation.mutate(command);}
 function transition(action:'pick'|'pack'|'cancel-allocation'|'create',allocationId:string) {const fields=source();if(fields)submit({action,body:{...fields,allocationId}});}
 function shipping(action:'dispatch'|'cancel'|'deliver',shipmentId:string) {const fields=source();if(fields){if(action==='deliver'){if(!observedAt){setLocalError('Enter the observed UTC delivery time.');return;}submit({action,body:{...fields,shipmentId,observedAt}});}else submit({action,body:{...fields,shipmentId}});}}
 function addLine(event:FormEvent) {event.preventDefault();if(!skuId||!quantity)return;if(draftLines.some(line=>line.skuId===skuId)){setLocalError('This SKU is already in the draft. Remove its line to change the quantity.');return;}setDraftLines([...draftLines,{skuId,quantity,unit}]);setQuantity('');setLocalError('');}
 function createOrder(event:FormEvent) {event.preventDefault();const fields=source();if(fields)submit({action:'order',body:{...fields,facilityId,customerReference,lines:draftLines}});}
 function allocate(event:FormEvent) {event.preventDefault();const fields=source();if(fields)submit({action:'allocate',body:{...fields,orderId,lineId,quantity:allocationQuantity}});}
 function refresh() {void orders.refetch();if(orderId){void detail.refetch();void allocations.refetch();void shipments.refetch();}}
 return <><section><h2>Demand and shipments</h2><p>Allocate batches, confirm picking and packing, then dispatch. An order is fulfilled when its demand is dispatched; delivery requires observed evidence.</p>
 <button className="secondary" disabled={locked||orders.isFetching||loading} onClick={refresh}>Refresh workflows</button>
 {[orders,detail,allocations,shipments].filter(query=>query.isError).map((query,index)=><p role="alert" className="error" key={index}>{query.error!.message}</p>)}
 {operator&&<><h3>Event identity</h3><p>Enter a distinct source reference before each command. For delivery, use the evidence reference.</p><div className="record-form">
 <label>Source system<input required maxLength={80} value={sourceSystem} disabled={locked} onChange={event=>setSource(event.target.value)}/></label>
 <label>Source reference<input required maxLength={160} value={externalId} disabled={locked} onChange={event=>setExternal(event.target.value)}/></label>
 </div></>}
 {localError&&<p role="alert" className="error">{localError}</p>}
 {mutation.isError&&<div role="alert" className="error">{mutation.error.message}{!rejected&&<p>Result is unconfirmed. Keep this page open and retry the same command. Command reference: {pending?.body.idempotencyKey}</p>}</div>}
 {mutation.isSuccess&&<p role="status">{mutation.data.action} recorded. Refresh shows current workflow state.</p>}
 {pending&&<div className="pagination"><button disabled={mutation.isPending} onClick={()=>mutation.mutate(pending)}>{mutation.isPending?'Recording...':'Retry same command'}</button>{rejected&&<button className="secondary" onClick={()=>{setPending(null);mutation.reset();}}>Edit rejected request</button>}</div>}
 </section>
 {operator&&<section><h2>Create demand order</h2><div className="record-form"><MasterPicker session={session} kind="facilities" value={facilityId} disabled={locked} onSelect={setFacility}/><label>Customer reference<input value={customerReference} disabled={locked} maxLength={160} onChange={event=>setCustomer(event.target.value)}/></label></div>
 <form className="record-form" onSubmit={addLine}><MasterPicker session={session} kind="skus" value={skuId} disabled={locked} onSelect={(id,unit)=>{setSku(id);if(unit)setUnit(unit);}}/><label>Demand quantity ({unit})<input required inputMode="decimal" value={quantity} disabled={locked} onChange={event=>setQuantity(event.target.value)}/></label><div className="form-action"><button disabled={locked||!skuId||draftLines.length>=50}>Add demand line</button></div></form>
 <ul>{draftLines.map(line=><li key={line.skuId}>{line.quantity} {line.unit} · SKU {line.skuId} <button className="secondary" disabled={locked} onClick={()=>setDraftLines(draftLines.filter(row=>row.skuId!==line.skuId))}>Remove line</button></li>)}</ul>
 <form onSubmit={createOrder}><button disabled={locked||!facilityId||!customerReference||draftLines.length===0}>Create order</button></form><small>Up to 50 distinct SKU lines per order, fulfilled from one facility.</small>
 </section>}
 <section><h2>Orders</h2><div className="table-wrap"><table><thead><tr><th>Customer / source reference</th><th>State</th><th>Open</th></tr></thead><tbody>{orderRows.map(row=><tr key={row.id}><td>{row.customerReference}<br/>{row.sourceSystem} / {row.externalId}</td><td>{row.state}</td><td><button disabled={locked} onClick={()=>selectOrder(row.id)}>{row.id===orderId?'Selected order':'Open order'}</button></td></tr>)}</tbody></table></div>
 <Pager label="orders" pages={ordersPages} setPages={setOrdersPages} next={orders.isError?null:orders.data?.nextCursor} busy={locked||orders.isFetching}/></section>
 {orderId&&<>{loading&&<p role="status">Loading workflow...</p>}{current&&<section><h2>Order demand · {current.order.state}</h2><p>Customer {current.order.customerReference} · Facility {current.order.facilityId}</p><div className="table-wrap"><table><thead><tr><th>SKU</th><th>Requested</th><th>Active allocation</th><th>Dispatched</th><th>Remaining</th></tr></thead><tbody>{current.lines.map(line=><tr key={line.id}><td>{line.skuCode} — {line.skuName}</td><td>{line.requested} {line.unit}</td><td>{line.allocated}</td><td>{line.shipped}</td><td>{line.remaining}</td></tr>)}</tbody></table></div>
 {operator&&['open','partially_shipped'].includes(current.order.state)&&<form className="record-form" onSubmit={allocate}><label>Demand line<select required value={lineId} disabled={!canAct} onChange={event=>setLine(event.target.value)}><option value="">Select a demand line</option>{current.lines.map(line=><option key={line.id} value={line.id}>{line.skuCode} — {line.skuName} · remaining {line.remaining} {line.unit}</option>)}</select></label><label>Allocation quantity<input required inputMode="decimal" value={allocationQuantity} disabled={!canAct} onChange={event=>setAllocationQuantity(event.target.value)}/></label><div className="form-action"><button disabled={!canAct||!lineId}>Allocate stock</button></div></form>}
 {operator&&current.order.state==='open'&&<button className="secondary" disabled={!canAct||current.lines.some(line=>!/^0(?:\.0+)?$/.test(line.allocated)||!/^0(?:\.0+)?$/.test(line.shipped))} onClick={()=>{const fields=source();if(fields)submit({action:'cancel-order',body:{...fields,orderId}});}}>Cancel unshipped order</button>}
 </section>}
 <section><h2>Allocation batches</h2><div className="table-wrap"><table><thead><tr><th>Batch</th><th>Quantity</th><th>State</th><th>Actions</th></tr></thead><tbody>{allocationRows.map(row=><tr key={row.id}><td>{row.id}</td><td>{row.quantity} {row.unit}</td><td>{row.state}</td><td>{operator&&<>
 {row.state==='allocated'&&<button disabled={!canAct} onClick={()=>transition('pick',row.id)}>Confirm picked</button>}{row.state==='picked'&&<button disabled={!canAct} onClick={()=>transition('pack',row.id)}>Confirm packed</button>}{row.state==='packed'&&!row.shipmentId&&<button disabled={!canAct} onClick={()=>transition('create',row.id)}>Create draft shipment</button>}{['allocated','picked','packed'].includes(row.state)&&!row.shipmentId&&<button className="secondary" disabled={!canAct} onClick={()=>transition('cancel-allocation',row.id)}>Cancel allocation</button>}</>}</td></tr>)}</tbody></table></div>
 <Pager label="allocations" pages={allocationPages} setPages={setAllocationPages} next={allocations.isError?null:allocations.data?.nextCursor} busy={locked||allocations.isFetching}/></section>
 <section><h2>Shipments</h2>{operator&&<label>Observed delivery time (UTC)<input placeholder="YYYY-MM-DDTHH:mm:ssZ" disabled={locked} value={observedAt} onChange={event=>setObserved(event.target.value)}/></label>}
 <div className="table-wrap"><table><thead><tr><th>Shipment / evidence</th><th>State</th><th>Actions</th></tr></thead><tbody>{shipmentRows.map(row=><tr key={row.id}><td>{row.sourceSystem} / {row.externalId}<br/>{row.deliveryReference&&`${row.deliverySource} / ${row.deliveryReference} · ${row.deliveredAt}`}</td><td>{row.state}</td><td>{operator&&<>{row.state==='draft'&&<><button disabled={!canAct} onClick={()=>shipping('dispatch',row.id)}>Confirm dispatch</button><button className="secondary" disabled={!canAct} onClick={()=>shipping('cancel',row.id)}>Cancel draft shipment</button></>}{row.state==='dispatched'&&<button disabled={!canAct} onClick={()=>shipping('deliver',row.id)}>Record observed delivery</button>}</>}</td></tr>)}</tbody></table></div>
 <Pager label="shipments" pages={shipmentPages} setPages={setShipmentPages} next={shipments.isError?null:shipments.data?.nextCursor} busy={locked||shipments.isFetching}/></section></>}
 </>;
}
