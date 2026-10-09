import type { PoolClient } from 'pg';
import type { Actor } from '../../identity/public';
import type { Transaction, Page } from '../../../platform/ports';
import { pageRows } from '../../../platform/pagination';
import type { ShippingRepository } from '../application/service';
import type { Shipment, ShippingSource, ShipmentInput, ShippingAction, ShippingResult } from '../domain/model';
const fields='id,tenant_id AS "tenantId",order_id AS "orderId",allocation_id AS "allocationId",state,source_system AS "sourceSystem",external_id AS "externalId",created_at AS "createdAt",updated_at AS "updatedAt",dispatched_at AS "dispatchedAt",delivered_at AS "deliveredAt",delivery_source AS "deliverySource",delivery_reference AS "deliveryReference"';
function map(row:Record<string,any>):Shipment {return {...row,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),dispatchedAt:row.dispatchedAt?.toISOString()??null,deliveredAt:row.deliveredAt?.toISOString()??null} as Shipment;}
export function shippingResource(id:string) {return `shipping/${id.toLowerCase()}`;}
export class PgShippingRepository implements ShippingRepository {
 async previous(tx:Transaction,actor:Actor,key:string) {
  const client=tx as PoolClient;await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`shipping-command/${actor.tenantId}/${key.toLowerCase()}`]);
  return (await client.query<{fingerprint:string;result:ShippingResult}>('SELECT fingerprint,result FROM public.sc_shipping_commands WHERE tenant_id=$1 AND idempotency_key=$2',[actor.tenantId,key])).rows[0]??null;
 }
 async complete(tx:Transaction,actor:Actor,input:ShippingSource,action:ShippingAction,fingerprint:string,result:ShippingResult) {await (tx as PoolClient).query('INSERT INTO public.sc_shipping_commands(tenant_id,idempotency_key,action,fingerprint,source_system,external_id,result)VALUES($1,$2,$3,$4,$5,$6,$7)',[actor.tenantId,input.idempotencyKey,action,fingerprint,input.sourceSystem,input.externalId,JSON.stringify(result)]);}
 async shipment(tx:Transaction,actor:Actor,id:string) {const row=(await (tx as PoolClient).query(`SELECT ${fields} FROM public.sc_shipments WHERE tenant_id=$1 AND id=$2`,[actor.tenantId,id])).rows[0];return row?map(row):null;}
 async create(tx:Transaction,actor:Actor,id:string,orderId:string,input:ShipmentInput) {await (tx as PoolClient).query("INSERT INTO public.sc_shipments(id,tenant_id,order_id,allocation_id,state,source_system,external_id,actor_id)VALUES($1,$2,$3,$4,'draft',$5,$6,$7)",[id,actor.tenantId,orderId,input.allocationId,input.sourceSystem,input.externalId,actor.actorId]);}
 async transition(tx:Transaction,actor:Actor,id:string,state:Shipment['state'],at:string,input:ShippingSource) {await (tx as PoolClient).query(`UPDATE public.sc_shipments SET state=$3,updated_at=now()${state==='dispatched'?',dispatched_at=$4':state==='delivered'?',delivered_at=$4,delivery_source=$5,delivery_reference=$6':''} WHERE tenant_id=$1 AND id=$2`,state==='dispatched'?[actor.tenantId,id,state,at]:state==='delivered'?[actor.tenantId,id,state,at,input.sourceSystem,input.externalId]:[actor.tenantId,id,state]);}
 async list(tx:Transaction,actor:Actor,orderId:string,page:Page) {
  const rows=(await (tx as PoolClient).query(`SELECT ${fields} FROM public.sc_shipments WHERE tenant_id=$1 AND order_id=$2 AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4`,[actor.tenantId,orderId,page.after?.id??null,page.limit+1])).rows.map(map);
  return {items:rows.slice(0,page.limit),nextCursor:pageRows(rows.map(row=>({id:row.id,code:'workflow'})),page.limit,actor.tenantId,shippingResource(orderId)).nextCursor};
 }
}
