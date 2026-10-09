import { Sku, SkuInput } from '../domain/model';
import type { Actor } from '../../identity/public';
import type { AuditService } from '../../audit/public';
import { OperationalError, UnitOfWork, Runtime, Transaction, Page, PageResult, OperationalList } from '../../../platform/ports';
export interface SkuRepository {
  stockMetadata(tx: Transaction, actor: Actor, id: string): Promise<{code: string; name: string; unit: SkuInput['unit']; quantityPrecision: number} | null>;
  list(tx: Transaction, actor: Actor, page: Page): Promise<PageResult<Sku>>;
  create(tx: Transaction, actor: Actor, id: string, input: SkuInput): Promise<void>;
}
export class SkuService {
  stockMetadata(tx: Transaction, actor: Actor, id: string) { return this.repository.stockMetadata(tx,actor,id); }
  constructor(private readonly work: UnitOfWork, private readonly repository: SkuRepository,
    private readonly audit: AuditService, private readonly runtime: Runtime) {}
  listIn(tx: Transaction, actor: Actor, page: Page) { return this.repository.list(tx,actor,page); }
  list(actor: Actor, page: Page): Promise<OperationalList<Sku>> {
    return this.work.transaction(actor, async tx => ({ schemaVersion: 1, source: 'operational', tenantId: actor.tenantId,
      generatedAt: this.runtime.now(), ...await this.repository.list(tx, actor, page) }));
  }
  create(actor: Actor, input: SkuInput) {
    if (actor.role !== 'operator') throw new OperationalError(403, 'An operator credential is required');
    if (input.unit === 'each' && input.quantityPrecision !== 0) throw new OperationalError(400, 'Each quantities require precision zero');
    return this.work.transaction(actor, async tx => {
      const id = this.runtime.id();
      await this.repository.create(tx, actor, id, input);
      await this.audit.append(tx, actor, id, 'sku', input.sourceSystem);
      return { schemaVersion: 1 as const, source: 'operational' as const, tenantId: actor.tenantId, id };
    });
  }
}
