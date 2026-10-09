import { createHash } from 'node:crypto';
import type { Actor } from '../domain/actor';
import type { AuditEntry } from '../domain/audit';

export class AuditLog {
  private entries: AuditEntry[] = [];
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  public record(
    actor: Actor,
    action: string,
    targetType: string,
    targetId: string,
    payload?: unknown
  ): AuditEntry {
    const timestamp = new Date().toISOString();
    const payloadSummary = payload ? JSON.stringify(payload) : undefined;
    const previousHash = this.lastHash;

    const dataToHash = `${previousHash}|${actor.tenantId}|${actor.actorId}|${action}|${targetType}|${targetId}|${timestamp}|${payloadSummary || ''}`;
    const hash = createHash('sha256').update(dataToHash).digest('hex');

    const entry: AuditEntry = {
      id: `audit-${this.entries.length + 1}`,
      tenantId: actor.tenantId,
      actorId: actor.actorId,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      correlationId: actor.correlationId,
      timestamp,
      payloadSummary,
      previousHash,
      hash,
    };

    this.entries.push(entry);
    this.lastHash = hash;
    return entry;
  }

  public verifyChainIntegrity(): boolean {
    let currentHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const entry of this.entries) {
      if (entry.previousHash !== currentHash) return false;
      const dataToHash = `${entry.previousHash}|${entry.tenantId}|${entry.actorId}|${entry.action}|${entry.targetType}|${entry.targetId}|${entry.timestamp}|${entry.payloadSummary || ''}`;
      const recalculated = createHash('sha256').update(dataToHash).digest('hex');
      if (recalculated !== entry.hash) return false;
      currentHash = entry.hash;
    }
    return true;
  }

  public getEntries(tenantId?: string): AuditEntry[] {
    if (tenantId) return this.entries.filter((e) => e.tenantId === tenantId);
    return [...this.entries];
  }
}
