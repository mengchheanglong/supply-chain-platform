import type { PoolClient } from 'pg';
import type { Actor } from '../../identity/public';
import type { Transaction, Page } from '../../../platform/ports';
import { pageRows } from '../../../platform/pagination';
import { decimal } from '../domain/quantity';
import type { InventoryRepository } from '../application/service';
import type { ReservationOwner, StockKey, StockCommand, CommandSource, InventoryAction, CommandResult, RawReservation, Reservation, Movement } from '../domain/model';
export function inventoryResource(resource: string, key: StockKey) { return `inventory-${resource}/${key.facilityId.toLowerCase()}/${key.skuId.toLowerCase()}`; }
export class PgInventoryRepository implements InventoryRepository {
  async previous(tx: Transaction, actor: Actor, key: string) {
    const client = tx as PoolClient;
    // Transaction locks disappear on commit/rollback; hash collisions only serialize unrelated work.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`inventory-command/${actor.tenantId}/${key.toLowerCase()}`]);
    const result = await client.query<{fingerprint:string;result:CommandResult}>('SELECT fingerprint,result FROM public.sc_inventory_commands WHERE tenant_id=$1 AND idempotency_key=$2',[actor.tenantId,key]);
    return result.rows[0] ?? null;
  }
  async complete(tx: Transaction, actor: Actor, source: CommandSource, action: InventoryAction, fingerprint: string, result: CommandResult) {
    await (tx as PoolClient).query(`INSERT INTO public.sc_inventory_commands(tenant_id,idempotency_key,action,fingerprint,source_system,external_id,result)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,[actor.tenantId,source.idempotencyKey,action,fingerprint,source.sourceSystem,source.externalId,JSON.stringify(result)]);
  }
  async balance(tx: Transaction, actor: Actor, key: StockKey, unit: StockCommand['unit'], precision: number, lock: boolean) {
    const client = tx as PoolClient;
    if (lock) await client.query(`INSERT INTO public.sc_inventory_balances(tenant_id,facility_id,sku_id,unit,quantity_precision)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[actor.tenantId,key.facilityId,key.skuId,unit,precision]);
    const result = await client.query<{onHand:string;reserved:string}>(`SELECT on_hand::text AS "onHand",reserved::text AS reserved FROM public.sc_inventory_balances
      WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3 ${lock?'FOR UPDATE':''}`,[actor.tenantId,key.facilityId,key.skuId]);
    return result.rows[0] ?? {onHand:'0',reserved:'0'};
  }
  async update(tx: Transaction, actor: Actor, key: StockKey, onHand: bigint, reserved: bigint) {
    await (tx as PoolClient).query('UPDATE public.sc_inventory_balances SET on_hand=$4,reserved=$5 WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3',[actor.tenantId,key.facilityId,key.skuId,onHand.toString(),reserved.toString()]);
  }
  async reservation(tx: Transaction, actor: Actor, id: string, lock: boolean) {
    const result = await (tx as PoolClient).query<RawReservation>(`SELECT id,facility_id AS "facilityId",sku_id AS "skuId",quantity::text AS quantity,state,owner_type AS "ownerType",owner_id AS "ownerId"
      FROM public.sc_inventory_reservations WHERE tenant_id=$1 AND id=$2 ${lock?'FOR UPDATE':''}`,[actor.tenantId,id]);
    return result.rows[0] ?? null;
  }
  async reserve(tx: Transaction, actor: Actor, input: StockCommand, id: string, atoms: bigint, owner?: ReservationOwner) {
    await (tx as PoolClient).query(`INSERT INTO public.sc_inventory_reservations(id,tenant_id,facility_id,sku_id,quantity,state,source_system,external_id,actor_id,idempotency_key,owner_type,owner_id)
      VALUES($1,$2,$3,$4,$5,'active',$6,$7,$8,$9,$10,$11)`,[id,actor.tenantId,input.facilityId,input.skuId,atoms.toString(),input.sourceSystem,input.externalId,actor.actorId,input.idempotencyKey,owner?.type ?? null,owner?.id ?? null]);
  }
  async transition(tx: Transaction, actor: Actor, id: string, state: 'released' | 'consumed') {
    await (tx as PoolClient).query('UPDATE public.sc_inventory_reservations SET state=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2',[actor.tenantId,id,state]);
  }
  async movement(tx: Transaction, actor: Actor, key: StockKey, input: CommandSource, id: string, delta: bigint, reservationId: string | null) {
    await (tx as PoolClient).query(`INSERT INTO public.sc_inventory_movements(id,tenant_id,facility_id,sku_id,delta,action,reservation_id,source_system,external_id,actor_id,idempotency_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[id,actor.tenantId,key.facilityId,key.skuId,delta.toString(),reservationId?'ship':'receive',reservationId,input.sourceSystem,input.externalId,actor.actorId,input.idempotencyKey]);
  }
  async reservations(tx: Transaction, actor: Actor, key: StockKey, page: Page) {
    const result = await (tx as PoolClient).query(`SELECT r.id,r.tenant_id AS "tenantId",r.facility_id AS "facilityId",r.sku_id AS "skuId",r.quantity::text,
      r.state,r.owner_type AS "ownerType",r.owner_id AS "ownerId",r.source_system AS "sourceSystem",r.external_id AS "externalId",r.actor_id AS "actorId",r.idempotency_key AS "idempotencyKey",
      r.created_at AS "createdAt",r.updated_at AS "updatedAt",b.unit,b.quantity_precision AS "quantityPrecision"
      FROM public.sc_inventory_reservations r JOIN public.sc_inventory_balances b USING(tenant_id,facility_id,sku_id)
      WHERE r.tenant_id=$1 AND r.facility_id=$2 AND r.sku_id=$3 AND ($4::uuid IS NULL OR r.id>$4)
      ORDER BY r.id LIMIT $5`,[actor.tenantId,key.facilityId,key.skuId,page.after?.id ?? null,page.limit+1]);
    const rows: Reservation[] = result.rows.map(row=>({...row,quantity:decimal(BigInt(row.quantity),row.quantityPrecision),createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString()}));
    return this.page(rows,page,actor,key,'reservations');
  }
  async movements(tx: Transaction, actor: Actor, key: StockKey, page: Page) {
    const result = await (tx as PoolClient).query(`SELECT m.id,m.tenant_id AS "tenantId",m.facility_id AS "facilityId",m.sku_id AS "skuId",m.delta::text,m.action,
      m.reservation_id AS "reservationId",m.source_system AS "sourceSystem",m.external_id AS "externalId",m.actor_id AS "actorId",m.idempotency_key AS "idempotencyKey",
      m.created_at AS "createdAt",b.unit,b.quantity_precision AS "quantityPrecision"
      FROM public.sc_inventory_movements m JOIN public.sc_inventory_balances b USING(tenant_id,facility_id,sku_id)
      WHERE m.tenant_id=$1 AND m.facility_id=$2 AND m.sku_id=$3 AND ($4::uuid IS NULL OR m.id>$4)
      ORDER BY m.id LIMIT $5`,[actor.tenantId,key.facilityId,key.skuId,page.after?.id ?? null,page.limit+1]);
    const rows: Movement[] = result.rows.map(row=>({...row,delta:decimal(BigInt(row.delta),row.quantityPrecision),createdAt:row.createdAt.toISOString()}));
    return this.page(rows,page,actor,key,'movements');
  }
  private page<T extends {id:string}>(rows:T[],page:Page,actor:Actor,key:StockKey,resource:string) {
    const cursor = pageRows(rows.map(row=>({id:row.id,code:'inventory'})),page.limit,actor.tenantId,inventoryResource(resource,key));
    return {items:rows.slice(0,page.limit),nextCursor:cursor.nextCursor};
  }
  async totals(tx: Transaction, actor: Actor, key: StockKey) {
    // One statement snapshot avoids observing a projection and history from different commits.
    const result = await (tx as PoolClient).query<{onHand:string;reserved:string;ledgerOnHand:string;activeReserved:string}>(`SELECT
      COALESCE((SELECT on_hand FROM public.sc_inventory_balances WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3),0)::text AS "onHand",
      COALESCE((SELECT reserved FROM public.sc_inventory_balances WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3),0)::text AS reserved,
      COALESCE((SELECT sum(delta) FROM public.sc_inventory_movements WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3),0)::text AS "ledgerOnHand",
      COALESCE((SELECT sum(quantity) FROM public.sc_inventory_reservations WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3 AND state='active'),0)::text AS "activeReserved"`,[actor.tenantId,key.facilityId,key.skuId]);
    return result.rows[0]!;
  }
}
