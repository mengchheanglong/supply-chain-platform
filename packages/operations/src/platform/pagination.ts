import type { Page } from './ports';
import { OperationalError } from './ports';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function pageInput(tenantId: string, resource: string, limit: unknown, cursor: unknown): Page {
  if (limit !== undefined && (typeof limit !== 'string' || !/^\d+$/.test(limit))) throw new OperationalError(400, 'Invalid page limit');
  const size = limit === undefined ? 50 : Number(limit);
  if (size < 1 || size > 200) throw new OperationalError(400, 'Page limit must be between 1 and 200');
  if (cursor === undefined) return { limit: size };
  try {
    if (typeof cursor !== 'string' || cursor.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error();
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (value.v !== 1 || value.tenantId !== tenantId || value.resource !== resource ||
        typeof value.code !== 'string' || !/^[A-Za-z0-9_.-]{1,64}$/.test(value.code) || typeof value.id !== 'string' || !uuid.test(value.id)) throw new Error();
    return { limit: size, after: { code: value.code, id: value.id } };
  } catch { throw new OperationalError(400, 'Invalid or foreign page cursor'); }
}
export function pageRows<T extends { code: string; id: string }>(rows: T[], limit: number, tenantId: string, resource: string) {
  const items = rows.slice(0, limit), last = items.at(-1);
  const nextCursor = rows.length > limit && last ? Buffer.from(JSON.stringify({ v: 1, tenantId, resource, code: last.code, id: last.id })).toString('base64url') : null;
  return { items, nextCursor };
}
