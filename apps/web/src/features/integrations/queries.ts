import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { MappingInput, ImportInput, ExportInput, SnapshotInput } from '@supply-chain/contracts';
import { sessionSignal, type Session } from '../../app/session';
export type ExchangeCommand={action:'mapping';body:MappingInput}|{action:'import';body:ImportInput}|{action:'export';body:ExportInput}|{action:'snapshot';body:SnapshotInput};
const key=(session:Session)=>['exchange',session.actor.tenantId,session.id];
export function useExchange(session:Session,mappingCursor:string|null,documentCursor:string|null,id:string,snapshotCursor:string|null='',snapshotId:string=''){
 const prefix=key(session),token=session.credential;
 return {
  mappings:useQuery({queryKey:[...prefix,'mappings',mappingCursor],queryFn:({signal})=>api('/api/v1/integrations/mappings','get',{token,signal:sessionSignal(session,signal),query:{limit:10,cursor:mappingCursor??undefined}})}),
  documents:useQuery({queryKey:[...prefix,'documents',documentCursor],queryFn:({signal})=>api('/api/v1/integrations/documents','get',{token,signal:sessionSignal(session,signal),query:{limit:10,cursor:documentCursor??undefined}})}),
  document:useQuery({queryKey:[...prefix,'document',id],enabled:!!id,queryFn:({signal})=>api('/api/v1/integrations/document','get',{token,signal:sessionSignal(session,signal),query:{id}})}),
  snapshots:useQuery({queryKey:[...prefix,'snapshots',snapshotCursor],queryFn:({signal})=>api('/api/v1/integrations/snapshots','get',{token,signal:sessionSignal(session,signal),query:{limit:10,cursor:snapshotCursor??undefined}})}),
  snapshot:useQuery({queryKey:[...prefix,'snapshot',snapshotId],enabled:!!snapshotId,queryFn:({signal})=>api('/api/v1/integrations/snapshot','get',{token,signal:sessionSignal(session,signal),query:{id:snapshotId}})})
 };
}
export function useExchangeCommand(session:Session,onSuccess:(id:string|null)=>void){
 const client=useQueryClient();return useMutation({retry:false,mutationFn:async(command:ExchangeCommand)=>{
  const options={token:session.credential,signal:sessionSignal(session)};
  if(command.action==='mapping')return api('/api/v1/integrations/mappings','post',{...options,body:command.body});
  if(command.action==='import')return api('/api/v1/integrations/imports','post',{...options,body:command.body});
  if(command.action==='export')return api('/api/v1/integrations/exports','post',{...options,body:command.body});
  return api('/api/v1/integrations/snapshots','post',{...options,body:command.body});
 },onSuccess:result=>{if(session.controller.signal.aborted)return;onSuccess('id' in result?result.id:null);void client.invalidateQueries({queryKey:key(session)});}});
}
