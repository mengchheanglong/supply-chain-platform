import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@supply-chain/api-client';
import { SessionProvider, useSession } from '../../app/session';
import Page from './Page';
vi.mock('@supply-chain/api-client',async importOriginal=>({...await importOriginal<typeof import('@supply-chain/api-client')>(),api:vi.fn()}));
function Fixture(){const {session,connect,disconnect}=useSession();return <><button onClick={()=>void connect('fixture')}>Connect</button><button onClick={disconnect}>Disconnect</button>{session&&<Page key={session.id}/>}</>;}
const stock={tenantId:'tenant',facilityId:'f1',skuId:'s1',unit:'each',quantityPrecision:0,onHand:'10',reserved:'0',available:'10'};
const posts:any[]=[];let failWrite=true,failRead=false;
async function setup(){
 posts.length=0;failWrite=true;failRead=false;vi.mocked(api).mockReset();
 vi.mocked(api).mockImplementation(async(path,method,options)=>{
  if(path==='/api/v1/context')return {schemaVersion:1,tenantId:'tenant',tenantName:'Test',timezone:'UTC',actorId:'actor',role:'operator'} as any;
  if(path==='/api/v1/facilities')return {items:[{id:'f1',code:'WH-1',name:'Warehouse'}],nextCursor:null} as any;
  if(path==='/api/v1/skus')return {items:[{id:'s1',code:'SKU-1',name:'Article',unit:'each'}],nextCursor:null} as any;
  if(method==='post'){posts.push(options?.body);if(failWrite)throw new Error('Connection lost');return {schemaVersion:1,source:'operational',tenantId:'tenant',action:'receive',idempotencyKey:(options?.body as any).idempotencyKey,stock,reservationId:null,movementId:'movement'} as any;}
  if(failRead)throw new Error('Persistence unavailable');
  if(path==='/api/v1/inventory/balance')return {stock} as any;
  if(path==='/api/v1/inventory/reconciliation')return {consistent:true} as any;
  return {items:[],nextCursor:null} as any;
 });render(<SessionProvider><Fixture/></SessionProvider>);fireEvent.click(screen.getByText('Connect'));
 await screen.findByText('WH-1 — Warehouse');fireEvent.change(screen.getByLabelText('Facility'),{target:{value:'f1'}});
 await screen.findByText('SKU-1 — Article');fireEvent.change(screen.getByLabelText('SKU'),{target:{value:'s1'}});
 await screen.findByText('Ledger and active reservations reconcile.');
}
afterEach(cleanup);
test('an unconfirmed write retains its original command and retries without optimistic stock',async()=>{
 await setup();
 fireEvent.change(screen.getByLabelText('Quantity (each)'),{target:{value:'3'}});
 fireEvent.change(screen.getByLabelText('Source system'),{target:{value:'test'}});
 fireEvent.change(screen.getByLabelText('Source reference'),{target:{value:'receipt-1'}});
 fireEvent.click(screen.getByText('Record receive'));await screen.findByRole('alert');
 expect(posts).toHaveLength(1);expect(screen.queryByText('13 each')).toBeNull();
 expect((screen.getByLabelText('Quantity (each)') as HTMLInputElement).disabled).toBe(true);
 const original=posts[0];failWrite=false;fireEvent.click(screen.getByText('Retry same command'));
 await screen.findByText(/receive recorded/);expect(posts).toHaveLength(2);expect(posts[1]).toEqual(original);
 expect((screen.getByLabelText('Quantity (each)') as HTMLInputElement).disabled).toBe(false);
});
test('failed inventory refresh hides balances and disconnect clears inventory',async()=>{
 await setup();expect(screen.getAllByText('10 each').length).toBe(2);
 failRead=true;fireEvent.click(screen.getByText('Refresh inventory'));
 await waitFor(()=>expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));expect(screen.queryByText('10 each')).toBeNull();
 fireEvent.click(screen.getByText('Disconnect'));expect(screen.queryByText('Movement ledger')).toBeNull();expect(screen.queryByText('Reservations')).toBeNull();
});
