import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession, recordKey } from './session';
import { api } from '@supply-chain/api-client';
vi.mock('@supply-chain/api-client',async importOriginal=>({...await importOriginal<typeof import('@supply-chain/api-client')>(),api:vi.fn()}));
const context=(tenantId:string)=>({schemaVersion:1 as const,tenantId,tenantName:tenantId,timezone:'UTC',actorId:tenantId,role:'operator' as const});
function Probe() {
  const state=useSession();return <><button onClick={()=>void state.connect('credential-A')}>Connect A</button><button onClick={()=>void state.connect('credential-B')}>Connect B</button><button onClick={state.disconnect}>Disconnect</button><span data-testid="actor">{state.session?.actor.tenantId??'none'}</span><span role="alert">{state.error}</span></>;
}
beforeEach(()=>{vi.mocked(api).mockReset();});afterEach(cleanup);
test('a late connection cannot replace the newer identity; prior request is aborted',async()=>{
 let resolveA:(value:any)=>void=()=>{};
 vi.mocked(api).mockImplementationOnce(()=>new Promise(resolve=>{resolveA=resolve;})).mockResolvedValueOnce(context('B') as any);
 render(<SessionProvider><Probe/></SessionProvider>);
 fireEvent.click(screen.getByText('Connect A'));const firstSignal=(vi.mocked(api).mock.calls[0][2] as any).signal;
 fireEvent.click(screen.getByText('Connect B'));
 await waitFor(()=>expect(screen.getByTestId('actor').textContent).toBe('B'));
 expect(firstSignal.aborted).toBe(true);resolveA(context('A'));
 await waitFor(()=>expect(screen.getByTestId('actor').textContent).toBe('B'));
});
test('disconnect prevents an outstanding credential request from restoring access',async()=>{
 let finish:(value:any)=>void=()=>{};vi.mocked(api).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 render(<SessionProvider><Probe/></SessionProvider>);fireEvent.click(screen.getByText('Connect A'));fireEvent.click(screen.getByText('Disconnect'));finish(context('A'));
 await waitFor(()=>expect(screen.getByTestId('actor').textContent).toBe('none'));
});
test('invalid credentials leave no active identity and show a genuine failure',async()=>{
 vi.mocked(api).mockImplementation(async()=>{throw new Error('Invalid or revoked');});
 const {result}=renderHook(()=>useSession(),{wrapper:SessionProvider});
 await act(async()=>{await result.current.connect('fixture');});
 expect(result.current.session).toBeNull();expect(result.current.error).toBe('Invalid or revoked');
});
test('record keys scope tenant and session but never include the credential',()=>{
 const session={actor:context('tenant'),id:'session',credential:'secret',controller:new AbortController()};
 expect(recordKey(session,'facilities',null)).toEqual(['records','tenant','session','facilities',null]);
});
