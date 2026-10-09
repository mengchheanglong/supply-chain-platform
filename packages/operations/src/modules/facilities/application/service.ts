import { Facility, FacilityInput, validTimezone } from '../domain/model';
import type { Actor } from '../../identity/public';
import type { AuditService } from '../../audit/public';
import { OperationalError, UnitOfWork, Runtime, Transaction, Page, PageResult, OperationalList } from '../../../platform/ports';
export interface FacilityRepository {
  exists(tx: Transaction, actor: Actor, id: string): Promise<boolean>;
  list(tx: Transaction, actor: Actor, page: Page): Promise<PageResult<Facility>>;
  create(tx: Transaction, actor: Actor, id: string, input: FacilityInput): Promise<void>;
}
export class FacilityService {
  exists(tx: Transaction, actor: Actor, id: string) { return this.repository.exists(tx,actor,id); }
  constructor(private readonly work: UnitOfWork, private readonly repository: FacilityRepository,
    private readonly audit: AuditService, private readonly runtime: Runtime) {}
  listIn(tx: Transaction, actor: Actor, page: Page) { return this.repository.list(tx,actor,page); }
  list(actor: Actor, page: Page): Promise<OperationalList<Facility>> {
    return this.work.transaction(actor, async tx => ({ schemaVersion: 1, source: 'operational', tenantId: actor.tenantId,
      generatedAt: this.runtime.now(), ...await this.repository.list(tx, actor, page) }));
  }
  create(actor: Actor, input: FacilityInput) {
    if (actor.role !== 'operator') throw new OperationalError(403, 'An operator credential is required');
    if (!validTimezone(input.timezone)) throw new OperationalError(400, 'A valid IANA timezone is required');
    return this.work.transaction(actor, async tx => {
      const id = this.runtime.id();
      await this.repository.create(tx, actor, id, input);
      await this.audit.append(tx, actor, id, 'facility', input.sourceSystem);
      return { schemaVersion: 1 as const, source: 'operational' as const, tenantId: actor.tenantId, id };
    });
  }
}
