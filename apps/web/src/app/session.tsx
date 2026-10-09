import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import type { TenantContext } from '@supply-chain/contracts';
export interface Session { actor:TenantContext; credential:string; id:string; controller:AbortController }
interface SessionState { session:Session|null; busy:boolean; error:string; connect(token:string):Promise<void>; disconnect():void }
const Context = createContext<SessionState|null>(null);
export function newQueryClient() { return new QueryClient({defaultOptions:{queries:{retry:false,staleTime:0},mutations:{retry:false}}}); }
export function SessionProvider({children}:{children:ReactNode}) {
  const [session,setSession] = useState<Session|null>(null);
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const [client,setClient] = useState(newQueryClient);
  const current = useRef<AbortController|null>(null), generation = useRef(0);
  useEffect(()=>()=>{generation.current++;current.current?.abort();},[]);
  function reset() {
    generation.current++;current.current?.abort();current.current=null;
    void client.cancelQueries();client.clear();setClient(newQueryClient());setSession(null);setError('');setBusy(false);
  }
  async function connect(credential:string) {
    reset(); const version = generation.current, controller = new AbortController();current.current=controller;setBusy(true);
    try {
      const actor = await api('/api/v1/context','get',{token:credential,signal:controller.signal});
      if(version===generation.current) setSession({actor,credential,id:crypto.randomUUID(),controller});
    } catch(error) { if(version===generation.current) setError(error instanceof Error?error.message:'Connection unavailable'); }
    finally { if(version===generation.current) setBusy(false); }
  }
  return <Context.Provider value={{session,busy,error,connect,disconnect:reset}}><QueryClientProvider client={client}>{children}</QueryClientProvider></Context.Provider>;
}
export function useSession() { const value=useContext(Context);if(!value) throw new Error('Session provider missing');return value; }
export function recordKey(session:Session,resource:string,cursor:string|null) { return ['records',session.actor.tenantId,session.id,resource,cursor]; }
export function sessionSignal(session:Session,signal?:AbortSignal) { return signal?AbortSignal.any([session.controller.signal,signal]):session.controller.signal; }
