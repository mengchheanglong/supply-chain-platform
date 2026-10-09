import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { projectRoot } from './config';

export function migrationFiles() {
  const directory = resolve(projectRoot, 'database/migrations');
  return readdirSync(directory).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort().map(name => {
    const sql = readFileSync(resolve(directory, name), 'utf8');
    return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });
}
export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const role = await client.query<{ unsafe: boolean }>('SELECT rolsuper OR rolbypassrls AS unsafe FROM pg_roles WHERE rolname=current_user');
    if (role.rows[0]?.unsafe !== false) throw new Error('Migrations require a non-superuser application owner');
    await client.query("SELECT pg_advisory_lock(hashtextextended('supply-chain-platform:migrations',0))");
    await client.query('CREATE TABLE IF NOT EXISTS public.sc_schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = await client.query<{ name: string; checksum: string }>('SELECT name,checksum FROM public.sc_schema_migrations');
    const files = migrationFiles();
    for (const row of applied.rows) {
      if (files.find(file => file.name === row.name)?.checksum !== row.checksum) throw new Error('Applied migration is missing or changed');
    }
    for (const file of files) {
      if (applied.rows.some(row => row.name === file.name)) continue;
      await client.query('BEGIN');
      try {
        await client.query(file.sql);
        await client.query('INSERT INTO public.sc_schema_migrations(name,checksum) VALUES ($1,$2)', [file.name, file.checksum]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtextextended('supply-chain-platform:migrations',0))").catch(() => {});
    client.release();
  }
}
