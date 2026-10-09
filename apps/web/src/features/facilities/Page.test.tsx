import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '../../app/session';
import Page from './Page';
import { api } from '@supply-chain/api-client';
vi.mock('@supply-chain/api-client',async importOriginal=>({...await importOriginal<typeof import('@supply-chain/api-client')>(),api:vi.fn()}));
function Fixture(){const {session,connect,disconnect}=useSession();return <><button onClick={()=>void connect('fixture')}>Connect</button><button onClick={disconnect}>Disconnect</button>{session&&<Page key={session.id}/>}</>;}
const row={id:'warehouse',tenantId:'tenant',code:'WH-1',name:'Fixture warehouse',kind:'warehouse',timezone:'UTC',latitude:0,longitude:0,locationSource:'estimated',sourceSystem:'test',externalId:'fixture',createdAt:'2026-01-01T00:00:00Z'};
function setup(){vi.mocked(api).mockReset();vi.mocked(api).mockImplementation(async(path,method)=>{
 if(path==='/api/v1/context')return {schemaVersion:1,tenantId:'tenant',tenantName:'Test',timezone:'UTC',actorId:'actor',role:'operator'} as any;
 if(method==='post')throw new Error('Persistence unavailable');
 return {schemaVersion:1,source:'operational',tenantId:'tenant',generatedAt:'2026-01-01T00:00:00Z',items:[row],nextCursor:'page2'} as any;
 });render(<SessionProvider><Fixture/></SessionProvider>);fireEvent.click(screen.getByText('Connect'));}
afterEach(cleanup);
test('pagination consumes the server cursor and an outage clears displayed records',async()=>{
 setup();await screen.findByText('WH-1');fireEvent.click(screen.getByText('Next page'));
 await waitFor(()=>expect(vi.mocked(api).mock.calls.some(call=>(call[2] as any)?.query?.cursor==='page2')).toBe(true));
 await waitFor(()=>expect((screen.getByText('Refresh') as HTMLButtonElement).disabled).toBe(false));
 vi.mocked(api).mockRejectedValue(new Error('Persistence unavailable'));fireEvent.click(screen.getByText('Refresh'));
 await screen.findByRole('alert');expect(screen.queryByText('WH-1')).toBeNull();
});
test('failed writes do not create optimistic records and disconnect clears visible tenant data',async()=>{
 setup();await screen.findByText('WH-1');
 const fields:Record<string,string>={'Code':'WH-NEW','Name':'New warehouse','Business timezone':'UTC','Latitude (degrees)':'0','Longitude (degrees)':'0','Source system':'test','External ID':'new'};
 for(const [label,value] of Object.entries(fields))fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.click(screen.getByText('Create record'));await screen.findByRole('alert');expect(screen.queryByText('WH-NEW')).toBeNull();
 fireEvent.click(screen.getByText('Disconnect'));expect(screen.queryByText('WH-1')).toBeNull();
});
