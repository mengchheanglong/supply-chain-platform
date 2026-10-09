export interface AuditEntry {
  id: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  correlationId?: string;
  timestamp: string;
  payloadSummary?: string;
  previousHash: string;
  hash: string;
}
