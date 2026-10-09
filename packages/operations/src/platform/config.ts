import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Configuration { connectionString: string; host: string; port: number; poolMax?: number }
export const projectRoot = resolve(__dirname, '../../../..');
function port(value: string, name: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) throw new Error(`Invalid ${name}`);
  return Number(value);
}
export function configuration(env: NodeJS.ProcessEnv = process.env): Configuration {
  let connectionString = env.DATABASE_URL;
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || !url.pathname.slice(1)) throw new Error();
    } catch { throw new Error('DATABASE_URL must specify a PostgreSQL database and credentials'); }
  } else {
    if (!env.DB_PASSWORD_FILE) throw new Error('Configure DATABASE_URL or DB_PASSWORD_FILE');
    let password: string;
    try { password = readFileSync(resolve(projectRoot, env.DB_PASSWORD_FILE), 'utf8').trim(); }
    catch { throw new Error('Database password file is unavailable'); }
    if (!password) throw new Error('Database password file is empty');
    const url = new URL('postgresql://127.0.0.1');
    url.hostname = env.DB_HOST || '127.0.0.1';
    url.port = String(port(env.DB_PORT || '5433', 'DB_PORT'));
    url.username = env.DB_USER || 'operations_app';
    url.password = password;
    url.pathname = '/' + (env.DB_NAME || 'supply_chain_ops');
    connectionString = url.toString();
  }
  const host = env.API_HOST || '127.0.0.1';
  if (!['127.0.0.1', '::1', '0.0.0.0'].includes(host)) throw new Error('Invalid API_HOST');
  const poolMax = port(env.DB_POOL_MAX || '8', 'DB_POOL_MAX');
  if (poolMax > 100) throw new Error('DB_POOL_MAX must be at most 100');
  return { connectionString, host, port: port(env.API_PORT || '3100', 'API_PORT'), poolMax };
}
