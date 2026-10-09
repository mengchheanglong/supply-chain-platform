import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { StockCommand, ReservationCommand } from '@supply-chain/contracts';
import { sessionSignal, type Session } from '../../app/session';
export type InventoryCommand = {action:'receive';body:StockCommand} | {action:'reserve';body:StockCommand} | {action:'release';body:ReservationCommand} | {action:'ship';body:ReservationCommand};
export function inventoryKey(session:Session) { return ['inventory',session.actor.tenantId,session.id]; }
export function useInventory(session:Session,facilityId:string,skuId:string,reservationCursor:string|null,movementCursor:string|null) {
  const options={token:session.credential,query:{facilityId,skuId}},enabled=!!facilityId&&!!skuId;
  const prefix=[...inventoryKey(session),facilityId,skuId];
  const balance=useQuery({queryKey:[...prefix,'balance'],enabled,queryFn:({signal})=>api('/api/v1/inventory/balance','get',{...options,signal:sessionSignal(session,signal)})});
  const reconciliation=useQuery({queryKey:[...prefix,'reconciliation'],enabled,queryFn:({signal})=>api('/api/v1/inventory/reconciliation','get',{...options,signal:sessionSignal(session,signal)})});
  const reservations=useQuery({queryKey:[...prefix,'reservations',reservationCursor],enabled,queryFn:({signal})=>api('/api/v1/inventory/reservations','get',{...options,signal:sessionSignal(session,signal),query:{...options.query,limit:10,cursor:reservationCursor??undefined}})});
  const movements=useQuery({queryKey:[...prefix,'movements',movementCursor],enabled,queryFn:({signal})=>api('/api/v1/inventory/movements','get',{...options,signal:sessionSignal(session,signal),query:{...options.query,limit:10,cursor:movementCursor??undefined}})});
  return {balance,reconciliation,reservations,movements};
}
export function useInventoryCommand(session:Session,onSuccess:()=>void) {
  const client=useQueryClient();
  return useMutation({mutationFn:(input:InventoryCommand)=>{
    const options={token:session.credential,signal:sessionSignal(session)};
    if(input.action==='receive')return api('/api/v1/inventory/receive','post',{...options,body:input.body});
    if(input.action==='reserve')return api('/api/v1/inventory/reserve','post',{...options,body:input.body});
    if(input.action==='release')return api('/api/v1/inventory/release','post',{...options,body:input.body});
    return api('/api/v1/inventory/ship','post',{...options,body:input.body});
  },onSuccess:async()=>{if(!session.controller.signal.aborted){onSuccess();await client.invalidateQueries({queryKey:inventoryKey(session)});}}});
}
