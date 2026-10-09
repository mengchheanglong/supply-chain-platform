export interface WorkflowSource { idempotencyKey: string; sourceSystem: string; externalId: string }
export interface DemandLine { skuId: string; quantity: string; unit: 'each' | 'kg' | 'm3' | 'litre' }
export interface OrderInput extends WorkflowSource { facilityId: string; customerReference: string; lines: DemandLine[] }
export interface Order { id: string; tenantId: string; facilityId: string; customerReference: string; state: 'open' | 'partially_shipped' | 'fulfilled' | 'cancelled'; sourceSystem: string; externalId: string; createdAt: string; updatedAt: string }
export interface OrderLine { id: string; orderId: string; skuId: string; skuCode: string; skuName: string; unit: DemandLine['unit']; quantityPrecision: number; requested: string; allocated: string; shipped: string; remaining: string }
export interface Allocation { id: string; tenantId: string; orderId: string; lineId: string; reservationId: string; quantity: string; unit: DemandLine['unit']; quantityPrecision: number; state: 'allocated' | 'picked' | 'packed' | 'shipped' | 'cancelled'; shipmentId: string | null; createdAt: string; updatedAt: string }
export interface RawLine extends Omit<OrderLine,'remaining'> {}
export interface RawAllocation extends Allocation { facilityId: string; skuId: string; skuCode: string; skuName: string; unit: DemandLine['unit']; quantityPrecision: number }
export interface AllocateInput extends WorkflowSource { orderId: string; lineId: string; quantity: string }
export interface AllocationInput extends WorkflowSource { allocationId: string }
export interface CancelOrderInput extends WorkflowSource { orderId: string }
export type FulfillmentAction = 'order' | 'allocate' | 'pick' | 'pack' | 'cancel-allocation' | 'cancel-order';
export interface FulfillmentResult { schemaVersion: 1; source: 'operational'; tenantId: string; idempotencyKey: string; action: FulfillmentAction; orderId: string; allocationId: string | null }
