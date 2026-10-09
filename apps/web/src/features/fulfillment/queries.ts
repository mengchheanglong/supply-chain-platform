import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { OrderInput, AllocateInput, AllocationInput, CancelOrderInput, ShipmentInput, ShipmentTransition, DeliveryInput } from '@supply-chain/contracts';
import { sessionSignal, type Session } from '../../app/session';
export type WorkflowCommand = {action:'order';body:OrderInput}|{action:'allocate';body:AllocateInput}|{action:'pick'|'pack'|'cancel-allocation';body:AllocationInput}|{action:'cancel-order';body:CancelOrderInput}|{action:'create';body:ShipmentInput}|{action:'dispatch'|'cancel';body:ShipmentTransition}|{action:'deliver';body:DeliveryInput};
export function workflowKey(session:Session) {return ['workflow',session.actor.tenantId,session.id];}
export function useWorkflows(session:Session,orderId:string,ordersCursor:string|null,allocationCursor:string|null,shipmentCursor:string|null) {
 const prefix=workflowKey(session),token=session.credential;
 return {
  orders:useQuery({queryKey:[...prefix,'orders',ordersCursor],queryFn:({signal})=>api('/api/v1/fulfillment/orders','get',{token,signal:sessionSignal(session,signal),query:{limit:10,cursor:ordersCursor??undefined}})}),
  detail:useQuery({queryKey:[...prefix,orderId,'detail'],enabled:!!orderId,queryFn:({signal})=>api('/api/v1/fulfillment/order','get',{token,signal:sessionSignal(session,signal),query:{orderId}})}),
  allocations:useQuery({queryKey:[...prefix,orderId,'allocations',allocationCursor],enabled:!!orderId,queryFn:({signal})=>api('/api/v1/fulfillment/allocations','get',{token,signal:sessionSignal(session,signal),query:{orderId,limit:10,cursor:allocationCursor??undefined}})}),
  shipments:useQuery({queryKey:[...prefix,orderId,'shipments',shipmentCursor],enabled:!!orderId,queryFn:({signal})=>api('/api/v1/shipping/shipments','get',{token,signal:sessionSignal(session,signal),query:{orderId,limit:10,cursor:shipmentCursor??undefined}})})
 };
}
export function useWorkflowCommand(session:Session,onSuccess:(orderId:string)=>void) {
 const client=useQueryClient();
 return useMutation({retry:false,mutationFn:async (command:WorkflowCommand)=>{
  const options={token:session.credential,signal:sessionSignal(session),body:command.body};
  switch(command.action) {
   case 'order':return api('/api/v1/fulfillment/orders','post',{...options,body:command.body});
   case 'allocate':return api('/api/v1/fulfillment/allocate','post',{...options,body:command.body});
   case 'pick':return api('/api/v1/fulfillment/pick','post',{...options,body:command.body});
   case 'pack':return api('/api/v1/fulfillment/pack','post',{...options,body:command.body});
   case 'cancel-allocation':return api('/api/v1/fulfillment/cancel-allocation','post',{...options,body:command.body});
   case 'cancel-order':return api('/api/v1/fulfillment/cancel-order','post',{...options,body:command.body});
   case 'create':return api('/api/v1/shipping/create','post',{...options,body:command.body});
   case 'dispatch':return api('/api/v1/shipping/dispatch','post',{...options,body:command.body});
   case 'cancel':return api('/api/v1/shipping/cancel','post',{...options,body:command.body});
   case 'deliver':return api('/api/v1/shipping/deliver','post',{...options,body:command.body});
  }
 },onSuccess:result=>{
  if(session.controller.signal.aborted)return;
  onSuccess(result.orderId);void client.invalidateQueries({queryKey:workflowKey(session)});
  void client.invalidateQueries({queryKey:['inventory',session.actor.tenantId,session.id]});
 }});
}
