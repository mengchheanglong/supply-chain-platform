import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { CreateSku } from '@supply-chain/contracts';
import { recordKey, sessionSignal, type Session } from '../../app/session';
export function useRecords(session:Session,cursor:string|null) {
  return useQuery({queryKey:recordKey(session,'skus',cursor),queryFn:({signal})=>api('/api/v1/skus','get',{
    token:session.credential,signal:sessionSignal(session,signal),query:{limit:50,cursor:cursor??undefined}})});
}
export function useCreate(session:Session) {
  const client=useQueryClient();
  return useMutation({mutationFn:(body:CreateSku)=>api('/api/v1/skus','post',{token:session.credential,signal:sessionSignal(session),body}),
    onSuccess:async()=>{if(!session.controller.signal.aborted) await client.invalidateQueries({queryKey:['records',session.actor.tenantId,session.id,'skus']});}});
}
