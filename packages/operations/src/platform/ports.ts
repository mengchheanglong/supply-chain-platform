import type { Actor } from '../modules/identity/public';
export type Transaction = unknown;
export interface UnitOfWork { transaction<T>(actor: Actor, work: (tx: Transaction) => Promise<T>): Promise<T> }
export interface Runtime { id(): string; now(): string }
export class OperationalError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export interface Page { limit: number; after?: { code: string; id: string } }
export interface PageResult<T> { items: T[]; nextCursor: string | null }
export interface OperationalList<T> extends PageResult<T> {
  schemaVersion: 1; source: 'operational'; tenantId: string; generatedAt: string;
}
