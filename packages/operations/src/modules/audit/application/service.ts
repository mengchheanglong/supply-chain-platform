import type { Actor } from '../../identity/public';
import type { Runtime, Transaction } from '../../../platform/ports';
export type AuditEntity = 'facility' | 'sku' | 'inventory_movement' | 'reservation' | 'order' | 'allocation' | 'shipment' | 'source_mapping' | 'exchange_document' | 'planning_snapshot';
export type AuditAction = 'created' | 'received' | 'reserved' | 'released' | 'consumed' | 'ordered' | 'allocated' | 'picked' | 'packed' | 'cancelled' | 'dispatched' | 'delivered' | 'mapped' | 'validated' | 'rejected' | 'exported' | 'snapshot_approved';
export interface WorkflowAudit { domain: 'fulfillment' | 'shipping' | 'integrations'; key: string }
export interface AuditRepository { append(tx: Transaction, actor: Actor, id: string, entity: AuditEntity, source: string, auditId: string, correlationId: string, action: AuditAction, idempotencyKey?: string, workflow?: WorkflowAudit): Promise<void> }
export class AuditService {
  constructor(private readonly repository: AuditRepository, private readonly runtime: Runtime) {}
  append(tx: Transaction, actor: Actor, id: string, entity: AuditEntity, source: string, action: AuditAction = 'created', idempotencyKey?: string, workflow?: WorkflowAudit) {
    return this.repository.append(tx, actor, id, entity, source, this.runtime.id(), actor.correlationId ?? this.runtime.id(), action, idempotencyKey, workflow);
  }
}
