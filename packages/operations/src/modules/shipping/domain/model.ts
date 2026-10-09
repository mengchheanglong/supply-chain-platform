export interface ShippingSource { idempotencyKey:string; sourceSystem:string; externalId:string }
export interface ShipmentInput extends ShippingSource { allocationId:string }
export interface ShipmentTransition extends ShippingSource { shipmentId:string }
export interface DeliveryInput extends ShipmentTransition { observedAt:string }
export type ShippingAction='create'|'dispatch'|'deliver'|'cancel';
export interface Shipment { id:string;tenantId:string;orderId:string;allocationId:string;state:'draft'|'dispatched'|'delivered'|'cancelled';sourceSystem:string;externalId:string;createdAt:string;updatedAt:string;dispatchedAt:string|null;deliveredAt:string|null;deliverySource:string|null;deliveryReference:string|null }
export interface ShippingResult {schemaVersion:1;source:'operational';tenantId:string;idempotencyKey:string;action:ShippingAction;shipmentId:string;orderId:string;state:Shipment['state'];movementId:string|null}
