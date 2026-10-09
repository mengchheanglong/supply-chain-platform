import type { PoolClient } from 'pg';
import type { Facility, FacilityInput } from '../domain/model';
import type { FacilityRepository } from '../application/service';
import type { Actor } from '../../identity/public';
import type { Transaction, Page } from '../../../platform/ports';
import { pageRows } from '../../../platform/pagination';
export class PgFacilityRepository implements FacilityRepository {
  async exists(tx: Transaction, actor: Actor, id: string): Promise<boolean> {
    const result = await (tx as PoolClient).query(`SELECT id FROM public.sc_facilities WHERE tenant_id=$1 AND id=$2`,[actor.tenantId,id]);
    return result.rows.length > 0;
  }

  async list(tx: Transaction, actor: Actor, page: Page) {
    const result = await (tx as PoolClient).query<Omit<Facility, 'createdAt'> & { createdAt: Date }>(`
      SELECT id,tenant_id AS "tenantId",code,name,kind,timezone,latitude,longitude,location_source AS "locationSource",
        source_system AS "sourceSystem",external_id AS "externalId",created_at AS "createdAt"
      FROM public.sc_facilities WHERE tenant_id=$1 AND ($2::text IS NULL OR (code,id) > ($2,$3::uuid))
      ORDER BY code,id LIMIT $4`, [actor.tenantId,page.after?.code ?? null,page.after?.id ?? null,page.limit+1]);
    return pageRows(result.rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),page.limit,actor.tenantId,'facilities');
  }
  async create(tx: Transaction, actor: Actor, id: string, input: FacilityInput) {
    await (tx as PoolClient).query(`INSERT INTO public.sc_facilities (id,tenant_id,code,name,kind,timezone,latitude,longitude,location_source,source_system,external_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [id,actor.tenantId,input.code,input.name,input.kind,input.timezone,input.latitude,input.longitude,input.locationSource,input.sourceSystem,input.externalId]);
  }
}
