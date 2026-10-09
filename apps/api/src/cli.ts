import 'reflect-metadata';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { configuration, projectRoot } from './config';
import { tokenHash, validTimezone } from '@supply-chain/operations';
import { migrate } from './migrations';
async function run() {
  const pool = new Pool({ connectionString: configuration().connectionString, connectionTimeoutMillis: 2000 });
  try {
    const command = process.argv[2];
    if (command === 'migrate') { await migrate(pool); console.log('Migrations applied and checksums verified'); }
    else if (command === 'tenant:create') {
      const name = process.argv[3], timezone = process.argv[4];
      if (!name || name.length > 160 || !timezone || !validTimezone(timezone)) throw new Error('Usage: tenant:create "Organization name" IANA/timezone');
      const token = randomBytes(32).toString('base64url'), tenantId = randomUUID(), actorId = randomUUID();
      const directory = resolve(projectRoot,'.secrets');
      mkdirSync(directory,{ recursive:true });
      const file = resolve(directory,`${tenantId}.json`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO public.sc_tenants(id,name,timezone) VALUES($1,$2,$3)',[tenantId,name,timezone]);
        await client.query("INSERT INTO public.sc_api_keys(id,tenant_id,token_hash,role) VALUES($1,$2,$3,'operator')",[actorId,tenantId,tokenHash(token)]);
        writeFileSync(file,JSON.stringify({ tenantId,actorId,role:'operator',token },null,2),{ mode:0o600,flag:'wx' });
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
      console.log(`Scoped operator credential saved to ${file}`);
    } else throw new Error('Unknown command');
  } finally { await pool.end(); }
}
run().catch(error => { console.error(error instanceof Error && error.message.startsWith('Usage:') ? error.message : 'Command failed; check configuration, migrations and database access'); process.exitCode = 1; });
