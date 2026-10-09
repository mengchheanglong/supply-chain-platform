import type { Actor } from '../../identity/public';
import type { InventoryService } from '../../inventory/public';
import { decimal, normalizeQuantity, quantityAtoms } from '../../inventory/public';
import type { FacilityService } from '../../facilities/public';
import type { SkuService } from '../../catalog/public';
import type { AuditService } from '../../audit/public';
import { OperationalError, type Transaction, type UnitOfWork, type Runtime, type Page, type PageResult } from '../../../platform/ports';
import { sourceInput, uuidInput } from '../../../platform/command-input';
import type { Order, RawLine, Allocation, RawAllocation, OrderInput, AllocateInput, AllocationInput, CancelOrderInput, WorkflowSource, FulfillmentAction, FulfillmentResult } from '../domain/model';
export interface FulfillmentRepository {
 previous(tx:Transaction,actor:Actor,key:string):Promise<{fingerprint:string;result:FulfillmentResult}|null>;
 complete(tx:Transaction,actor:Actor,input:WorkflowSource,action:FulfillmentAction,fingerprint:string,result:FulfillmentResult):Promise<void>;
 create(tx:Transaction,actor:Actor,id:string,input:OrderInput,lines:RawLine[]):Promise<void>;
 order(tx:Transaction,actor:Actor,id:string,lock:boolean):Promise<Order|null>;
 lines(tx:Transaction,actor:Actor,id:string):Promise<RawLine[]>;
 orders(tx:Transaction,actor:Actor,page:Page):Promise<PageResult<Order>>;
 allocations(tx:Transaction,actor:Actor,orderId:string,page:Page):Promise<PageResult<Allocation>>;
 allocationOrder(tx:Transaction,actor:Actor,id:string):Promise<string|null>;
 allocation(tx:Transaction,actor:Actor,id:string):Promise<RawAllocation|null>;
 allocate(tx:Transaction,actor:Actor,id:string,orderId:string,lineId:string,reservationId:string,amount:bigint):Promise<void>;
 allocationState(tx:Transaction,actor:Actor,id:string,state:Allocation['state'],shipmentId?:string|null):Promise<void>;
 lineTotals(tx:Transaction,actor:Actor,id:string,allocated:bigint,shipped:bigint):Promise<void>;
 orderState(tx:Transaction,actor:Actor,id:string,state:Order['state']):Promise<void>;
}
export class FulfillmentService {
 constructor(private readonly work:UnitOfWork,private readonly repository:FulfillmentRepository,private readonly inventory:InventoryService,
  private readonly facilities:FacilityService,private readonly catalog:SkuService,private readonly audit:AuditService,private readonly runtime:Runtime) {}
 private operator(actor:Actor) { if(actor.role!=='operator')throw new OperationalError(403,'An operator credential is required'); }
 private quantity(value:string) {try{return normalizeQuantity(value);}catch(error){throw new OperationalError(400,(error as Error).message);}}
 private atoms(value:string,precision:number) {try{return quantityAtoms(value,precision);}catch(error){throw new OperationalError(400,(error as Error).message);}}
 private fingerprint(action:FulfillmentAction,input:OrderInput|AllocateInput|AllocationInput|CancelOrderInput) {
  sourceInput(input);
  if(action==='order' && 'lines' in input) {
   uuidInput(input.facilityId);
   if(typeof input.customerReference!=='string'||input.customerReference.length>160||!/^\S(?:.*\S)?$/.test(input.customerReference)||!Array.isArray(input.lines)||input.lines.length<1||input.lines.length>50)throw new OperationalError(400,'Order requires a customer reference and 1–50 lines');
   const lines=input.lines.map(line=>[uuidInput(line.skuId),this.quantity(line.quantity),line.unit]).sort((a,b)=>a[0]!.localeCompare(b[0]!));
   if(new Set(lines.map(line=>line[0])).size!==lines.length)throw new OperationalError(400,'Each SKU may appear once per order');
   return JSON.stringify([action,uuidInput(input.facilityId),input.customerReference,lines,input.sourceSystem,input.externalId]);
  }
  if(action==='allocate' && 'quantity' in input)return JSON.stringify([action,uuidInput(input.orderId),uuidInput(input.lineId),this.quantity(input.quantity),input.sourceSystem,input.externalId]);
  if(action==='cancel-order' && 'orderId' in input)return JSON.stringify([action,uuidInput(input.orderId),input.sourceSystem,input.externalId]);
  if(['pick','pack','cancel-allocation'].includes(action)&&'allocationId' in input)return JSON.stringify([action,uuidInput(input.allocationId),input.sourceSystem,input.externalId]);
  throw new OperationalError(400,'Command input does not match its action');
 }
 async command(actor:Actor,action:FulfillmentAction,input:OrderInput|AllocateInput|AllocationInput|CancelOrderInput) {
  this.operator(actor);const fingerprint=this.fingerprint(action,input);
  return this.work.transaction(actor,async tx=>{
   const previous=await this.repository.previous(tx,actor,input.idempotencyKey);
   if(previous){if(previous.fingerprint!==fingerprint)throw new OperationalError(409,'Idempotency key was already used for a different command');return previous.result;}
   let orderId:string, allocationId:string|null=null, entity:'order'|'allocation'='order', event:'ordered'|'allocated'|'picked'|'packed'|'cancelled';
   if(action==='order' && 'lines' in input) {
    if(!await this.facilities.exists(tx,actor,input.facilityId))throw new OperationalError(404,'Facility not found in this tenant');
    orderId=this.runtime.id();const lines:RawLine[]=[];
    for(const line of input.lines) {
     const sku=await this.catalog.stockMetadata(tx,actor,line.skuId);if(!sku)throw new OperationalError(404,'SKU not found in this tenant');
     if(sku.unit!==line.unit)throw new OperationalError(400,'Quantity unit must match the SKU');
     lines.push({id:this.runtime.id(),orderId,skuId:line.skuId,skuCode:sku.code,skuName:sku.name,unit:line.unit,quantityPrecision:sku.quantityPrecision,requested:this.atoms(line.quantity,sku.quantityPrecision).toString(),allocated:'0',shipped:'0'});
    }
    await this.repository.create(tx,actor,orderId,input,lines);event='ordered';
   } else if(action==='allocate' && 'quantity' in input) {
    orderId=input.orderId;const order=await this.requireOrder(tx,actor,orderId,true);
    if(!['open','partially_shipped'].includes(order.state))throw new OperationalError(409,'Order does not accept allocations');
    const line=(await this.repository.lines(tx,actor,orderId)).find(line=>line.id===input.lineId.toLowerCase());if(!line)throw new OperationalError(404,'Order line not found');
    const amount=this.atoms(input.quantity,line.quantityPrecision);
    if(amount>BigInt(line.requested)-BigInt(line.allocated)-BigInt(line.shipped))throw new OperationalError(409,'Allocation exceeds remaining demand');
    allocationId=this.runtime.id();const held=await this.inventory.executeIn(tx,actor,'reserve',{facilityId:order.facilityId,skuId:line.skuId,quantity:input.quantity,unit:line.unit,...this.child(allocationId,'reserve')},{type:'fulfillment',id:allocationId});
    await this.repository.allocate(tx,actor,allocationId,orderId,line.id,held.reservationId!,amount);
    await this.repository.lineTotals(tx,actor,line.id,BigInt(line.allocated)+amount,BigInt(line.shipped));entity='allocation';event='allocated';
   } else if(action==='cancel-order' && 'orderId' in input) {
    orderId=input.orderId;const order=await this.requireOrder(tx,actor,orderId,true),lines=await this.repository.lines(tx,actor,orderId);
    if(order.state!=='open'||lines.some(line=>BigInt(line.allocated)>0n||BigInt(line.shipped)>0n))throw new OperationalError(409,'Cancel active allocations before cancelling an unshipped order');
    await this.repository.orderState(tx,actor,orderId,'cancelled');event='cancelled';
   } else if('allocationId' in input) {
    const allocation=await this.lockedAllocationIn(tx,actor,input.allocationId);orderId=allocation.orderId;allocationId=allocation.id;entity='allocation';
    if(action==='pick'&&allocation.state==='allocated'){await this.repository.allocationState(tx,actor,allocation.id,'picked');event='picked';}
    else if(action==='pack'&&allocation.state==='picked'){await this.repository.allocationState(tx,actor,allocation.id,'packed');event='packed';}
    else if(action==='cancel-allocation'&&['allocated','picked','packed'].includes(allocation.state)&&!allocation.shipmentId) {
     await this.inventory.executeIn(tx,actor,'release',{reservationId:allocation.reservationId,...this.child(allocation.id,'release')},{type:'fulfillment',id:allocation.id});
     const line=(await this.repository.lines(tx,actor,orderId)).find(line=>line.id===allocation.lineId)!;
     await this.repository.lineTotals(tx,actor,line.id,BigInt(line.allocated)-BigInt(allocation.quantity),BigInt(line.shipped));
     await this.repository.allocationState(tx,actor,allocation.id,'cancelled');event='cancelled';
    } else throw new OperationalError(409,'Invalid allocation transition; cancel its draft shipment first if claimed');
   } else throw new OperationalError(400,'Invalid command');
   await this.audit.append(tx,actor,allocationId??orderId,entity,input.sourceSystem,event,undefined,{domain:'fulfillment',key:input.idempotencyKey});
   const result:FulfillmentResult={schemaVersion:1,source:'operational',tenantId:actor.tenantId,idempotencyKey:input.idempotencyKey,action,orderId,allocationId};
   await this.repository.complete(tx,actor,input,action,fingerprint,result);return result;
  });
 }
 private child(id:string,action:string) {return {idempotencyKey:this.runtime.id(),sourceSystem:'fulfillment',externalId:`${id}:${action}`};}
 private async requireOrder(tx:Transaction,actor:Actor,id:string,lock:boolean) {uuidInput(id);const order=await this.repository.order(tx,actor,id,lock);if(!order)throw new OperationalError(404,'Order not found in this tenant');return order;}
 // Shipping participates in this transaction and acquires the aggregate lock before stock locks.
 async lockedAllocationIn(tx:Transaction,actor:Actor,id:string) {
  this.operator(actor);uuidInput(id);const orderId=await this.repository.allocationOrder(tx,actor,id);if(!orderId)throw new OperationalError(404,'Allocation not found in this tenant');
  await this.requireOrder(tx,actor,orderId,true);return (await this.repository.allocation(tx,actor,id))!;
 }
 async claimIn(tx:Transaction,actor:Actor,allocation:RawAllocation,shipmentId:string|null) {
  this.operator(actor);if(allocation.state!=='packed'||(shipmentId&&allocation.shipmentId))throw new OperationalError(409,'A packed, unclaimed allocation is required');
  await this.repository.allocationState(tx,actor,allocation.id,'packed',shipmentId);
 }
 async dispatchIn(tx:Transaction,actor:Actor,allocation:RawAllocation,shipmentId:string) {
  this.operator(actor);if(allocation.state!=='packed'||allocation.shipmentId!==shipmentId)throw new OperationalError(409,'Shipment does not own a packed allocation');
  const result=await this.inventory.executeIn(tx,actor,'ship',{reservationId:allocation.reservationId,...this.child(allocation.id,'ship')},{type:'fulfillment',id:allocation.id});
  const lines=await this.repository.lines(tx,actor,allocation.orderId),line=lines.find(line=>line.id===allocation.lineId)!;
  line.allocated=(BigInt(line.allocated)-BigInt(allocation.quantity)).toString();line.shipped=(BigInt(line.shipped)+BigInt(allocation.quantity)).toString();
  await this.repository.lineTotals(tx,actor,line.id,BigInt(line.allocated),BigInt(line.shipped));
  await this.repository.allocationState(tx,actor,allocation.id,'shipped');
  await this.repository.orderState(tx,actor,allocation.orderId,lines.every(line=>line.shipped===line.requested)?'fulfilled':'partially_shipped');return result;
 }
 list(actor:Actor,page:Page) {return this.work.transaction(actor,async tx=>({schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository.orders(tx,actor,page)}));}
 detail(actor:Actor,id:string) {return this.work.transaction(actor,async tx=>{
  const order=await this.requireOrder(tx,actor,id,true),lines=await this.repository.lines(tx,actor,id);
  return {schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),order,lines:lines.map(line=>({...line,requested:decimal(BigInt(line.requested),line.quantityPrecision),allocated:decimal(BigInt(line.allocated),line.quantityPrecision),shipped:decimal(BigInt(line.shipped),line.quantityPrecision),remaining:decimal(BigInt(line.requested)-BigInt(line.allocated)-BigInt(line.shipped),line.quantityPrecision)}))};
 });}
 allocations(actor:Actor,id:string,page:Page) {return this.work.transaction(actor,async tx=>{await this.requireOrder(tx,actor,id,false);return {schemaVersion:1 as const,source:'operational' as const,tenantId:actor.tenantId,generatedAt:this.runtime.now(),...await this.repository.allocations(tx,actor,id,page)};});}
}
