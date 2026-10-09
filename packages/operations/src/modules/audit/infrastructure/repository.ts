import type { PoolClient } from 'pg';
import type { Actor } from '../../identity/public';
import type { Transaction } from '../../../platform/ports';
import type { AuditRepository, AuditEntity, AuditAction, WorkflowAudit } from '../public';
export class PgAuditRepository implements AuditRepository {
  async append(tx: Transaction, actor: Actor, id: string, entity: AuditEntity, source: string, auditId: string, correlationId: string, action: AuditAction, idempotencyKey?: string, workflow?: WorkflowAudit) {
    await (tx as PoolClient).query(`INSERT INTO public.sc_audit_events(id,tenant_id,actor_id,correlation_id,entity_type,entity_id,action,source_system,idempotency_key,fulfillment_command_key,shipping_command_key,integration_command_key)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [auditId,actor.tenantId,actor.actorId,correlationId,entity,id,action,source,idempotencyKey ?? null,workflow?.domain==='fulfillment'?workflow.key:null,workflow?.domain==='shipping'?workflow.key:null,workflow?.domain==='integrations'?workflow.key:null]);
  }
}
