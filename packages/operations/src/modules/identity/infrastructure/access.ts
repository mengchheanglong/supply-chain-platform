import { createHash } from 'node:crypto';
import type { Database } from '../../../platform/database';
import type { Actor } from '../domain/actor';
import type { AccessRepository } from '../application/access';
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export class PgAccessRepository implements AccessRepository {
  constructor(private readonly db: Database) {}
  async ready() { return (await this.db.readiness()).status === 'ready'; }
  async findActor(token: string) {
    const result = await this.db.pool.query<Actor>(`SELECT k.id AS "actorId",k.tenant_id AS "tenantId",k.role,
      t.name AS "tenantName",t.timezone FROM public.sc_api_keys k JOIN public.sc_tenants t ON t.id=k.tenant_id
      WHERE k.token_hash=$1 AND k.revoked_at IS NULL`, [tokenHash(token)]);
    return result.rows[0];
  }
}
