import type { Actor } from '../../identity/public';
import type { FulfillmentService } from '../../fulfillment/public';
import type { AuditService } from '../../audit/public';
import { OperationalError, type UnitOfWork, type Transaction, type Runtime, type Page, type PageResult } from '../../../platform/ports';
import { sourceInput, uuidInput } from '../../../platform/command-input';
import type { ShippingSource, ShipmentInput, ShipmentTransition, DeliveryInput, ShippingAction, Shipment, ShippingResult } from '../domain/model';
export interface ShippingRepository {
 previous(tx:Transaction,actor:Actor,key:string):Promise<{fingerprint:string;result:ShippingResult}|null>;
 complete(tx:Transaction,actor:Actor,input:ShippingSource,action:ShippingAction,fingerprint:string,result:ShippingResult):Promise<void>;
 shipment(tx:Transaction,actor:Actor,id:string):Promise<Shipment|null>;
 create(tx:Transaction,actor:Actor,id:string,orderId:string,input:ShipmentInput):Promise<void>;
 transition(tx:Transaction,actor:Actor,id:string,state:Shipment['state'],at:string,input:ShippingSource):Promise<void>;
 list(tx:Transaction,actor:Actor,orderId:string,page:Page):Promise<PageResult<Shipment>>;
}
export class ShippingService {
 constructor(private readonly work:UnitOfWork,private readonly repository:ShippingRepository,private readonly fulfillment:FulfillmentService,private readonly audit:AuditService,private readonly runtime:Runtime) {}
 async command(actor:Actor,action:ShippingAction,input:ShipmentInput|ShipmentTransition|DeliveryInput) {
  if(actor.role!=='operator')throw new OperationalError(403,'An operator credential is required');sourceInput(input);
  const isCreate=action==='create';if(isCreate!==('allocationId' in input)||!['create','dispatch','deliver','cancel'].includes(action)||(action==='deliver')!==('observedAt' in input))throw new OperationalError(400,'Command input does not match its action');
  const id=uuidInput('allocationId' in input?input.allocationId:input.shipmentId);let observed:string|null=null;
  if('observedAt' in input){if(typeof input.observedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input.observedAt)||!Number.isFinite(Date.parse(input.observedAt)))throw new OperationalError(400,'Delivery requires an observed UTC timestamp');observed=new Date(input.observedAt).toISOString();const canonical=input.observedAt.replace(/(?:\.(\d{1,3}))?Z$/,(_,fraction:string|undefined)=>'.'+(fraction??'').padEnd(3,'0')+'Z');if(canonical!==observed)throw new OperationalError(400,'Invalid observed calendar timestamp');}
  const fingerprint=JSON.stringify([action,id,observed,input.sourceSystem,input.externalId]);
  return this.work.transaction(actor,async tx=>{
   const previous=await this.repository.previous(tx,actor,input.idempotencyKey);if(previous){if(previous.fingerprint!==fingerprint)throw new OperationalError(409,'Idempotency key was already used for a different command');return previous.result;}
   let shipmentId:string,orderId:string,state:Shipment['state'],movementId:string|null=null;
   if('allocationId' in input) {
    const allocation=await this.fulfillment.lockedAllocationIn(tx,actor,id);shipmentId=this.runtime.id();orderId=allocation.orderId;
    await this.fulfillment.claimIn(tx,actor,allocation,shipmentId);await this.repository.create(tx,actor,shipmentId,orderId,input);state='draft';
   } else {
    let shipment=await this.repository.shipment(tx,actor,id);if(!shipment)throw new OperationalError(404,'Shipment not found in this tenant');
    const allocation=await this.fulfillment.lockedAllocationIn(tx,actor,shipment.allocationId);
    // Re-read after the aggregate lock; competing commands may have committed while waiting.
    shipment=(await this.repository.shipment(tx,actor,id))!;shipmentId=shipment.id;orderId=shipment.orderId;
    if(action==='dispatch'&&shipment.state==='draft'){movementId=(await this.fulfillment.dispatchIn(tx,actor,allocation,shipmentId)).movementId;state='dispatched';}
    else if(action==='cancel'&&shipment.state==='draft'){if(allocation.shipmentId!==shipmentId)throw new OperationalError(409,'Shipment no longer owns the allocation');await this.fulfillment.claimIn(tx,actor,allocation,null);state='cancelled';}
    else if(action==='deliver'&&shipment.state==='dispatched') {
     if(Date.parse(observed!)<Date.parse(shipment.dispatchedAt!)||Date.parse(observed!)>Date.parse(this.runtime.now())+300000)throw new OperationalError(400,'Observed delivery must follow dispatch and cannot be more than five minutes in the future');state='delivered';
    } else throw new OperationalError(409,'Invalid shipment transition');
    await this.repository.transition(tx,actor,shipmentId,state,state==='delivered'?observed!:this.runtime.now(),input);
   }
   await this.audit.append(tx,actor,shipmentId,'shipment',input.sourceSystem,action==='create'?'created':action==='dispatch'?'dispatched':action==='deliver'?'delivered':'cancelled',undefined,{domain:'shipping',key:input.idempotencyKey});
   const result:ShippingResult={schemaVersion:1,source:'operational',tenantId:actor.tenantId,idempotencyKey:input.idempotencyKey,action,shipmentId,orderId,state,movementId};
   await this.repository.complete(tx,actor,input,action,fingerprint,result);return result;
  });
 }
 async list(actor:Actor,orderId:string,page:Page) {
  uuidInput(orderId);await this.fulfillment.detail(actor,orderId);
  return this.work.transaction(actor,async tx=>({schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository.list(tx,actor,orderId,page)}));
 }
}
