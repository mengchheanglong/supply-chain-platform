import type { Actor } from '../../identity/public';
import type { FacilityService } from '../../facilities/public';
import type { SkuService } from '../../catalog/public';
import type { AuditService } from '../../audit/public';
import { OperationalError, type UnitOfWork, type Runtime, type Transaction, type Page, type PageResult } from '../../../platform/ports';
import { decimal, normalizeQuantity, quantityAtoms, MAX_ATOMS } from '../domain/quantity';
import type { ReservationOwner, StockKey, StockCommand, ReservationCommand, CommandSource, InventoryAction, Stock, RawStock, RawReservation, CommandResult, Reservation, Movement } from '../domain/model';
export interface InventoryRepository {
  previous(tx: Transaction, actor: Actor, key: string): Promise<{fingerprint: string; result: CommandResult} | null>;
  complete(tx: Transaction, actor: Actor, source: CommandSource, action: InventoryAction, fingerprint: string, result: CommandResult): Promise<void>;
  balance(tx: Transaction, actor: Actor, key: StockKey, unit: StockCommand['unit'], precision: number, lock: boolean): Promise<RawStock>;
  update(tx: Transaction, actor: Actor, key: StockKey, onHand: bigint, reserved: bigint): Promise<void>;
  reservation(tx: Transaction, actor: Actor, id: string, lock: boolean): Promise<RawReservation | null>;
  reserve(tx: Transaction, actor: Actor, input: StockCommand, id: string, atoms: bigint, owner?: ReservationOwner): Promise<void>;
  transition(tx: Transaction, actor: Actor, id: string, state: 'released' | 'consumed'): Promise<void>;
  movement(tx: Transaction, actor: Actor, key: StockKey, input: CommandSource, id: string, delta: bigint, reservationId: string | null): Promise<void>;
  reservations(tx: Transaction, actor: Actor, key: StockKey, page: Page): Promise<PageResult<Reservation>>;
  movements(tx: Transaction, actor: Actor, key: StockKey, page: Page): Promise<PageResult<Movement>>;
  totals(tx: Transaction, actor: Actor, key: StockKey): Promise<{onHand: string; reserved: string; ledgerOnHand: string; activeReserved: string}>;
}
export class InventoryService {
  constructor(private readonly work: UnitOfWork, private readonly repository: InventoryRepository,
    private readonly facilities: FacilityService, private readonly catalog: SkuService,
    private readonly audit: AuditService, private readonly runtime: Runtime) {}
  private async metadata(tx: Transaction, actor: Actor, key: StockKey) {
    if (!await this.facilities.exists(tx, actor, key.facilityId)) throw new OperationalError(404, 'Facility or SKU not found in this tenant');
    const sku = await this.catalog.stockMetadata(tx, actor, key.skuId);
    if (!sku) throw new OperationalError(404, 'Facility or SKU not found in this tenant');
    return sku;
  }
  private stock(actor: Actor, key: StockKey, unit: StockCommand['unit'], precision: number, raw: RawStock): Stock {
    const onHand = BigInt(raw.onHand), reserved = BigInt(raw.reserved);
    return {...key,tenantId:actor.tenantId,unit,quantityPrecision:precision,onHand:decimal(onHand,precision),reserved:decimal(reserved,precision),available:decimal(onHand-reserved,precision)};
  }
  private normalized(action: InventoryAction, input: StockCommand | ReservationCommand) {
    try {
      return JSON.stringify('quantity' in input ? [action,input.facilityId.toLowerCase(),input.skuId.toLowerCase(),normalizeQuantity(input.quantity),input.unit,input.sourceSystem,input.externalId]
        : [action,input.reservationId.toLowerCase(),input.sourceSystem,input.externalId]);
    } catch (error) { throw new OperationalError(400,(error as Error).message); }
  }
  // Published transaction participant: future fulfillment commands may share this unit of work.
  async executeIn(tx: Transaction, actor: Actor, action: InventoryAction, input: StockCommand | ReservationCommand, owner?: ReservationOwner): Promise<CommandResult> {
    if (actor.role !== 'operator') throw new OperationalError(403,'An operator credential is required');
    if (!['receive','reserve','release','ship'].includes(action) || (['receive','reserve'].includes(action) !== ('quantity' in input))) throw new OperationalError(400,'Command input does not match its action');
    const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    const ids = 'quantity' in input ? [input.idempotencyKey,input.facilityId,input.skuId] : [input.idempotencyKey,input.reservationId];
    if (ids.some(id=>typeof id !== 'string' || !uuid.test(id)) || typeof input.sourceSystem !== 'string' || !/^[A-Za-z0-9_.-]{1,80}$/.test(input.sourceSystem) || typeof input.externalId !== 'string' || input.externalId.length>160 || !/^\S(?:.*\S)?$/.test(input.externalId)) throw new OperationalError(400,'Invalid command identifiers or source identity');
    const fingerprint = owner ? JSON.stringify([this.normalized(action,input),owner.type,owner.id.toLowerCase()]) : this.normalized(action,input);
    const previous = await this.repository.previous(tx,actor,input.idempotencyKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new OperationalError(409,'Idempotency key was already used for a different command');
      return previous.result;
    }
    let reservation: RawReservation | null = null;
    if ('reservationId' in input) {
      reservation = await this.repository.reservation(tx,actor,input.reservationId,false);
      if (!reservation) throw new OperationalError(404,'Reservation not found in this tenant');
      if (reservation.ownerType && (owner?.type !== reservation.ownerType || owner.id.toLowerCase() !== reservation.ownerId)) throw new OperationalError(409,'Reservation is managed by fulfillment; use its workflow');
    }
    const key: StockKey = 'facilityId' in input ? {facilityId:input.facilityId,skuId:input.skuId} : {facilityId:reservation!.facilityId,skuId:reservation!.skuId};
    const metadata = await this.metadata(tx,actor,key);
    const raw = await this.repository.balance(tx,actor,key,metadata.unit,metadata.quantityPrecision,true);
    let onHand = BigInt(raw.onHand), reserved = BigInt(raw.reserved), amount: bigint;
    let reservationId: string | null = null, movementId: string | null = null;
    if ('quantity' in input) {
      if (input.unit !== metadata.unit) throw new OperationalError(400,'Quantity unit must match the SKU; conversion is not implicit');
      try { amount = quantityAtoms(input.quantity,metadata.quantityPrecision); }
      catch (error) { throw new OperationalError(400,(error as Error).message); }
      if (action === 'receive') {
        onHand += amount;
        if (onHand > MAX_ATOMS) throw new OperationalError(409,'Stock exceeds the supported quantity bound');
        movementId = this.runtime.id();
        await this.repository.movement(tx,actor,key,input,movementId,amount,null);
      } else {
        if (amount > onHand-reserved) throw new OperationalError(409,'Insufficient available stock');
        reserved += amount;reservationId = this.runtime.id();
        await this.repository.reserve(tx,actor,input,reservationId,amount,owner);
      }
    } else {
      // All commands lock stock before locking its reservation, so release/ship races serialize.
      reservation = await this.repository.reservation(tx,actor,input.reservationId,true);
      if (!reservation || reservation.state !== 'active') throw new OperationalError(409,'Reservation is no longer active');
      amount = BigInt(reservation.quantity);reservationId = reservation.id;reserved -= amount;
      if (action === 'ship') {
        onHand -= amount;movementId = this.runtime.id();
        await this.repository.movement(tx,actor,key,input,movementId,-amount,reservationId);
      }
      await this.repository.transition(tx,actor,reservationId,action === 'ship' ? 'consumed' : 'released');
    }
    await this.repository.update(tx,actor,key,onHand,reserved);
    await this.audit.append(tx,actor,reservationId ?? movementId! ,reservationId ? 'reservation' : 'inventory_movement',input.sourceSystem,
      action === 'receive' ? 'received' : action === 'reserve' ? 'reserved' : action === 'ship' ? 'consumed' : 'released',input.idempotencyKey);
    const result: CommandResult = {schemaVersion:1,source:'operational',tenantId:actor.tenantId,idempotencyKey:input.idempotencyKey,action,
      stock:this.stock(actor,key,metadata.unit,metadata.quantityPrecision,{onHand:onHand.toString(),reserved:reserved.toString()}),reservationId,movementId};
    await this.repository.complete(tx,actor,input,action,fingerprint,result);
    return result;
  }
  command(actor: Actor, action: InventoryAction, input: StockCommand | ReservationCommand) {
    return this.work.transaction(actor,tx=>this.executeIn(tx,actor,action,input));
  }
  async balanceIn(tx: Transaction, actor: Actor, key: StockKey) {
    const sku=await this.metadata(tx,actor,key);
    return this.stock(actor,key,sku.unit,sku.quantityPrecision,await this.repository.balance(tx,actor,key,sku.unit,sku.quantityPrecision,false));
  }
  balance(actor: Actor, key: StockKey) {
    return this.work.transaction(actor,async tx=>{
      const sku = await this.metadata(tx,actor,key);
      return {schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),stock:this.stock(actor,key,sku.unit,sku.quantityPrecision,await this.repository.balance(tx,actor,key,sku.unit,sku.quantityPrecision,false))};
    });
  }
  list(actor: Actor, key: StockKey, page: Page, resource: 'reservations' | 'movements') {
    return this.work.transaction(actor,async tx=>{
      await this.metadata(tx,actor,key);
      return {schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository[resource](tx,actor,key,page)};
    });
  }
  reconcile(actor: Actor, key: StockKey) {
    return this.work.transaction(actor,async tx=>{
      const sku = await this.metadata(tx,actor,key), totals = await this.repository.totals(tx,actor,key);
      return {schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...key,unit:sku.unit,quantityPrecision:sku.quantityPrecision,
        onHand:decimal(BigInt(totals.onHand),sku.quantityPrecision),reserved:decimal(BigInt(totals.reserved),sku.quantityPrecision),
        ledgerOnHand:decimal(BigInt(totals.ledgerOnHand),sku.quantityPrecision),activeReserved:decimal(BigInt(totals.activeReserved),sku.quantityPrecision),
        consistent:totals.onHand===totals.ledgerOnHand && totals.reserved===totals.activeReserved};
    });
  }
}
