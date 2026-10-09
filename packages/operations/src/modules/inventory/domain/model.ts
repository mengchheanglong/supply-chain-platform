export type InventoryAction = 'receive' | 'reserve' | 'release' | 'ship';
export interface StockKey { facilityId: string; skuId: string }
export interface CommandSource { idempotencyKey: string; sourceSystem: string; externalId: string }
export interface StockCommand extends StockKey, CommandSource { quantity: string; unit: 'each' | 'kg' | 'm3' | 'litre' }
export interface ReservationCommand extends CommandSource { reservationId: string }
export interface Stock extends StockKey { tenantId: string; unit: StockCommand['unit']; quantityPrecision: number; onHand: string; reserved: string; available: string }
export interface Reservation extends StockKey { ownerType: 'fulfillment' | null; ownerId: string | null; id: string; tenantId: string; quantity: string; state: 'active' | 'released' | 'consumed'; sourceSystem: string; externalId: string; actorId: string; idempotencyKey: string; createdAt: string; updatedAt: string; unit: StockCommand['unit']; quantityPrecision: number }
export interface Movement extends StockKey { id: string; tenantId: string; delta: string; action: 'receive' | 'ship'; reservationId: string | null; sourceSystem: string; externalId: string; actorId: string; idempotencyKey: string; createdAt: string; unit: StockCommand['unit']; quantityPrecision: number }
export interface CommandResult { schemaVersion: 1; source: 'operational'; tenantId: string; idempotencyKey: string; action: InventoryAction; stock: Stock; reservationId: string | null; movementId: string | null }
export interface RawStock { onHand: string; reserved: string }
export interface ReservationOwner { type: 'fulfillment'; id: string }
export interface RawReservation extends StockKey { ownerType: 'fulfillment' | null; ownerId: string | null; id: string; quantity: string; state: Reservation['state'] }
