import type { PoolClient } from 'pg';
import type { Actor } from '../../identity/public';
import { decimal } from '../../inventory/public';
import type { Transaction, Page } from '../../../platform/ports';
import { pageRows } from '../../../platform/pagination';
import type { FulfillmentRepository } from '../application/service';
import type { Order, RawLine, Allocation, RawAllocation, OrderInput, WorkflowSource, FulfillmentAction, FulfillmentResult } from '../domain/model';
const orderFields='id,tenant_id AS "tenantId",facility_id AS "facilityId",customer_reference AS "customerReference",state,source_system AS "sourceSystem",external_id AS "externalId",created_at AS "createdAt",updated_at AS "updatedAt"';
const allocationFields='a.id,a.tenant_id AS "tenantId",a.order_id AS "orderId",a.line_id AS "lineId",a.reservation_id AS "reservationId",a.quantity::text,a.state,a.shipment_id AS "shipmentId",a.created_at AS "createdAt",a.updated_at AS "updatedAt"';
function dates<T extends {createdAt:Date;updatedAt:Date}>(row:T) {return {...row,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()};}
export function fulfillmentResource(kind:string,id?:string) {return id?`fulfillment-${kind}/${id.toLowerCase()}`:`fulfillment-${kind}`;}
export class PgFulfillmentRepository implements FulfillmentRepository {
 async previous(tx:Transaction,actor:Actor,key:string) {
  const client=tx as PoolClient;await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`fulfillment-command/${actor.tenantId}/${key.toLowerCase()}`]);
  return (await client.query<{fingerprint:string;result:FulfillmentResult}>('SELECT fingerprint,result FROM public.sc_fulfillment_commands WHERE tenant_id=$1 AND idempotency_key=$2',[actor.tenantId,key])).rows[0]??null;
 }
 async complete(tx:Transaction,actor:Actor,input:WorkflowSource,action:FulfillmentAction,fingerprint:string,result:FulfillmentResult) {
  await (tx as PoolClient).query('INSERT INTO public.sc_fulfillment_commands(tenant_id,idempotency_key,action,fingerprint,source_system,external_id,result)VALUES($1,$2,$3,$4,$5,$6,$7)',[actor.tenantId,input.idempotencyKey,action,fingerprint,input.sourceSystem,input.externalId,JSON.stringify(result)]);
 }
 async create(tx:Transaction,actor:Actor,id:string,input:OrderInput,lines:RawLine[]) {
  const client=tx as PoolClient;await client.query("INSERT INTO public.sc_orders(id,tenant_id,facility_id,customer_reference,state,source_system,external_id,actor_id)VALUES($1,$2,$3,$4,'open',$5,$6,$7)",[id,actor.tenantId,input.facilityId,input.customerReference,input.sourceSystem,input.externalId,actor.actorId]);
  for(const line of lines)await client.query('INSERT INTO public.sc_order_lines(id,tenant_id,order_id,sku_id,sku_code,sku_name,unit,quantity_precision,requested)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[line.id,actor.tenantId,id,line.skuId,line.skuCode,line.skuName,line.unit,line.quantityPrecision,line.requested]);
 }
 async order(tx:Transaction,actor:Actor,id:string,lock:boolean) {
  const row=(await (tx as PoolClient).query(`SELECT ${orderFields} FROM public.sc_orders WHERE tenant_id=$1 AND id=$2 ${lock?'FOR UPDATE':''}`,[actor.tenantId,id])).rows[0];return row?dates(row):null;
 }
 async lines(tx:Transaction,actor:Actor,id:string) {
  return (await (tx as PoolClient).query<RawLine>('SELECT id,order_id AS "orderId",sku_id AS "skuId",sku_code AS "skuCode",sku_name AS "skuName",unit,quantity_precision AS "quantityPrecision",requested::text,allocated::text,shipped::text FROM public.sc_order_lines WHERE tenant_id=$1 AND order_id=$2 ORDER BY id',[actor.tenantId,id])).rows;
 }
 async orders(tx:Transaction,actor:Actor,page:Page) {
  const rows=(await (tx as PoolClient).query(`SELECT ${orderFields} FROM public.sc_orders WHERE tenant_id=$1 AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT $3`,[actor.tenantId,page.after?.id??null,page.limit+1])).rows.map(dates);
  return {items:rows.slice(0,page.limit),nextCursor:pageRows(rows.map(row=>({id:row.id,code:'workflow'})),page.limit,actor.tenantId,fulfillmentResource('orders')).nextCursor};
 }
 async allocations(tx:Transaction,actor:Actor,orderId:string,page:Page) {
  const rows=(await (tx as PoolClient).query(`SELECT ${allocationFields},l.unit,l.quantity_precision AS "quantityPrecision" FROM public.sc_allocations a JOIN public.sc_order_lines l ON l.tenant_id=a.tenant_id AND l.id=a.line_id WHERE a.tenant_id=$1 AND a.order_id=$2 AND ($3::uuid IS NULL OR a.id>$3) ORDER BY a.id LIMIT $4`,[actor.tenantId,orderId,page.after?.id??null,page.limit+1])).rows.map(row=>{return {...dates(row),quantity:decimal(BigInt(row.quantity),row.quantityPrecision)};});
  return {items:rows.slice(0,page.limit),nextCursor:pageRows(rows.map(row=>({id:row.id,code:'workflow'})),page.limit,actor.tenantId,fulfillmentResource('allocations',orderId)).nextCursor};
 }
 async allocationOrder(tx:Transaction,actor:Actor,id:string) {return (await (tx as PoolClient).query<{orderId:string}>('SELECT order_id AS "orderId" FROM public.sc_allocations WHERE tenant_id=$1 AND id=$2',[actor.tenantId,id])).rows[0]?.orderId??null;}
 async allocation(tx:Transaction,actor:Actor,id:string) {
  const row=(await (tx as PoolClient).query(`SELECT ${allocationFields},o.facility_id AS "facilityId",l.sku_id AS "skuId",l.unit,l.quantity_precision AS "quantityPrecision" FROM public.sc_allocations a JOIN public.sc_orders o ON o.tenant_id=a.tenant_id AND o.id=a.order_id JOIN public.sc_order_lines l ON l.tenant_id=a.tenant_id AND l.id=a.line_id WHERE a.tenant_id=$1 AND a.id=$2`,[actor.tenantId,id])).rows[0];return row?dates(row) as RawAllocation:null;
 }
 async allocate(tx:Transaction,actor:Actor,id:string,orderId:string,lineId:string,reservationId:string,amount:bigint) {await (tx as PoolClient).query("INSERT INTO public.sc_allocations(id,tenant_id,order_id,line_id,reservation_id,quantity,state)VALUES($1,$2,$3,$4,$5,$6,'allocated')",[id,actor.tenantId,orderId,lineId,reservationId,amount.toString()]);}
 async allocationState(tx:Transaction,actor:Actor,id:string,state:Allocation['state'],shipmentId?:string|null) {
  await (tx as PoolClient).query(`UPDATE public.sc_allocations SET state=$3,updated_at=now()${shipmentId!==undefined?',shipment_id=$4':''} WHERE tenant_id=$1 AND id=$2`,shipmentId!==undefined?[actor.tenantId,id,state,shipmentId]:[actor.tenantId,id,state]);
 }
 async lineTotals(tx:Transaction,actor:Actor,id:string,allocated:bigint,shipped:bigint) {await (tx as PoolClient).query('UPDATE public.sc_order_lines SET allocated=$3,shipped=$4 WHERE tenant_id=$1 AND id=$2',[actor.tenantId,id,allocated.toString(),shipped.toString()]);}
 async orderState(tx:Transaction,actor:Actor,id:string,state:Order['state']) {await (tx as PoolClient).query('UPDATE public.sc_orders SET state=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2',[actor.tenantId,id,state]);}
}
