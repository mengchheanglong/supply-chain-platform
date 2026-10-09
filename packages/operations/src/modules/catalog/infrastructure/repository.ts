import type { PoolClient } from 'pg';
import type { Sku, SkuInput } from '../domain/model';
import type { SkuRepository } from '../application/service';
import type { Actor } from '../../identity/public';
import type { Transaction, Page } from '../../../platform/ports';
import { pageRows } from '../../../platform/pagination';
export class PgSkuRepository implements SkuRepository {
  async stockMetadata(tx: Transaction, actor: Actor, id: string): Promise<{code: string; name: string; unit: SkuInput['unit']; quantityPrecision: number} | null> {
    const result = await (tx as PoolClient).query(`SELECT code,name,unit,quantity_precision AS "quantityPrecision" FROM public.sc_skus WHERE tenant_id=$1 AND id=$2`,[actor.tenantId,id]);
    return result.rows[0] ?? null;
  }

  async list(tx: Transaction, actor: Actor, page: Page) {
    const result = await (tx as PoolClient).query<Omit<Sku, 'createdAt'> & { createdAt: Date }>(`
      SELECT id,tenant_id AS "tenantId",code,name,unit,quantity_precision AS "quantityPrecision",
        source_system AS "sourceSystem",external_id AS "externalId",created_at AS "createdAt"
      FROM public.sc_skus WHERE tenant_id=$1 AND ($2::text IS NULL OR (code,id) > ($2,$3::uuid))
      ORDER BY code,id LIMIT $4`, [actor.tenantId,page.after?.code ?? null,page.after?.id ?? null,page.limit+1]);
    return pageRows(result.rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),page.limit,actor.tenantId,'catalog');
  }
  async create(tx: Transaction, actor: Actor, id: string, input: SkuInput) {
    await (tx as PoolClient).query(`INSERT INTO public.sc_skus (id,tenant_id,code,name,unit,quantity_precision,source_system,external_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id,actor.tenantId,input.code,input.name,input.unit,input.quantityPrecision,input.sourceSystem,input.externalId]);
  }
}
