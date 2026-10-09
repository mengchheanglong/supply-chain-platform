import { OperationalError, UnitOfWork, Transaction } from './ports';
import type { Actor } from '../modules/identity/public';
import { Pool, PoolClient } from 'pg';
import { performance } from 'node:perf_hooks';

import { Configuration } from './config';
import { migrationFiles } from './migrations';

export interface Readiness { schemaVersion: 1; status: 'ready' | 'unavailable'; checks: { database: boolean; postgis: boolean; migrations: boolean; restrictedRole: boolean } }
export class Database implements UnitOfWork {
  readonly pool: Pool;
  readonly metrics = { transactions: 0, rollbacks: 0, poolWaitMs: 0, transactionMs: 0, queries: 0, queryMs: 0 };
  constructor(config: Configuration) {
    this.pool = new Pool({ connectionString: config.connectionString, max: config.poolMax ?? 8, connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 10000, statement_timeout: 3000, lock_timeout: 2000 });
    this.pool.on('error', () => console.error(JSON.stringify({ event: 'database.unavailable' })));
  }
  async onModuleDestroy() { await this.pool.end(); }
  async readiness(): Promise<Readiness> {
    const checks = { database: false, postgis: false, migrations: false, restrictedRole: false };
    try {
      const result = await this.pool.query<{ postgis: boolean; restricted: boolean }>(`
        SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='postgis') AS postgis,
          NOT (rolsuper OR rolbypassrls) AS restricted FROM pg_roles WHERE rolname=current_user`);
      checks.database = true;
      checks.postgis = result.rows[0]?.postgis === true;
      checks.restrictedRole = result.rows[0]?.restricted === true;
      const applied = await this.pool.query<{ name: string; checksum: string }>('SELECT name,checksum FROM public.sc_schema_migrations');
      const files = migrationFiles();
      checks.migrations = files.length > 0 && applied.rowCount === files.length &&
        files.every(file => applied.rows.some(row => row.name === file.name && row.checksum === file.checksum));
    } catch { /* Return genuine dependency state without credentials or SQL details. */ }
    return { schemaVersion: 1, status: Object.values(checks).every(Boolean) ? 'ready' : 'unavailable', checks };
  }
  async transaction<T>(actor: Actor, work: (client: Transaction) => Promise<T>): Promise<T> {
    let client: PoolClient;
    const waiting = performance.now();
    try { client = await this.pool.connect(); }
    catch { throw new OperationalError(503, 'Operational database unavailable'); }
    this.metrics.poolWaitMs += performance.now() - waiting;
    this.metrics.transactions++;
    const started = performance.now();
    // The transaction exposes a query port bound to this one checked-out client.
    // No SQL text, parameters, credentials or tenant IDs are retained in metrics.
    const transaction = { query: async (text: string, values?: unknown[]) => {
      const queryStarted = performance.now();
      try { return await client.query(text, values); }
      finally { this.metrics.queries++; this.metrics.queryMs += performance.now() - queryStarted; }
    } };
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [actor.tenantId]);
      const result = await work(transaction);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      this.metrics.rollbacks++;
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { this.metrics.transactionMs += performance.now() - started; client.release(); }
  }
}
