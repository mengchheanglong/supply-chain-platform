import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@supply-chain/api-client';
import { SessionProvider, useSession } from '../../app/session';
import Page from './Page';
vi.mock('@supply-chain/api-client',async importOriginal=>({...await importOriginal<typeof import('@supply-chain/api-client')>(),api:vi.fn()}));
function Fixture(){const {session,connect,disconnect}=useSession();return <><button onClick={()=>void connect('fixture')}>Connect</button><button onClick={disconnect}>Disconnect</button>{session&&<Page key={session.id}/>}</>;}
const posts:any[]=[];let failWrite=true,failRead=false,allocationState='packed',role='operator';
async function setup(reader=false){
 posts.length=0;failWrite=true;failRead=false;allocationState='packed';role=reader?'reader':'operator';vi.mocked(api).mockReset();
 vi.mocked(api).mockImplementation(async(path,method,options)=>{
  if(path==='/api/v1/context')return {schemaVersion:1,tenantId:'tenant',tenantName:'Test',timezone:'UTC',actorId:'actor',role} as any;
  if(path==='/api/v1/facilities'||path==='/api/v1/skus')return {items:[],nextCursor:null} as any;
  if(method==='post'){posts.push({path,body:options?.body});if(failWrite)throw new Error('Connection lost');return {schemaVersion:1,source:'operational',tenantId:'tenant',action:'dispatch',idempotencyKey:(options?.body as any).idempotencyKey,orderId:'o1',shipmentId:'shipment',state:'dispatched',movementId:'movement'} as any;}
  if(failRead)throw new Error('Persistence unavailable');
  if(path==='/api/v1/fulfillment/orders')return {items:[{id:'o1',customerReference:'customer-1',state:'open',sourceSystem:'test',externalId:'demand'}],nextCursor:null} as any;
  if(path==='/api/v1/fulfillment/order')return {order:{id:'o1',customerReference:'customer-1',state:'open',facilityId:'f1'},lines:[{id:'l1',skuId:'s1',unit:'each',requested:'10',allocated:'4',shipped:'0',remaining:'6'}]} as any;
  if(path==='/api/v1/fulfillment/allocations')return {items:[{id:'allocation',lineId:'l1',quantity:'4',state:allocationState,shipmentId:'shipment'}],nextCursor:null} as any;
  return {items:[{id:'shipment',state:'draft',sourceSystem:'test',externalId:'shipment-ref'}],nextCursor:null} as any;
 });
 render(<SessionProvider><Fixture/></SessionProvider>);fireEvent.click(screen.getByText('Connect'));await screen.findByText('Open order');fireEvent.click(screen.getByText('Open order'));await screen.findByText('Confirm dispatch');
}
afterEach(cleanup);
test('unconfirmed dispatch retains identical command and hides unrelated transitions',async()=>{
 await setup();expect(screen.queryByText('Cancel allocation')).toBeNull();expect(screen.queryByText('Create draft shipment')).toBeNull();
 fireEvent.change(screen.getByLabelText('Source system'),{target:{value:'test'}});fireEvent.change(screen.getByLabelText('Source reference'),{target:{value:'dispatch-event'}});fireEvent.click(screen.getByText('Confirm dispatch'));
 await screen.findByRole('alert');expect(posts).toHaveLength(1);expect((screen.getByLabelText('Source reference') as HTMLInputElement).disabled).toBe(true);
 expect((screen.getByText('Cancel draft shipment') as HTMLButtonElement).disabled).toBe(true);expect(screen.queryByText('dispatch recorded. Refresh shows current workflow state.')).toBeNull();
 failWrite=false;fireEvent.click(screen.getByText('Retry same command'));await screen.findByText(/dispatch recorded/);expect(posts).toHaveLength(2);expect(posts[1]).toEqual(posts[0]);
});
test('failed refresh hides demand and transition controls; disconnect clears workflow data',async()=>{
 await setup();expect(screen.getByText('Order demand · open')).toBeTruthy();failRead=true;fireEvent.click(screen.getByText('Refresh workflows'));
 await waitFor(()=>expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));expect(screen.queryByText('Order demand · open')).toBeNull();expect(screen.queryByText('Confirm dispatch')).toBeNull();
 fireEvent.click(screen.getByText('Disconnect'));expect(screen.queryByText('Allocation batches')).toBeNull();expect(screen.queryByText('Shipments')).toBeNull();
});
test('reader can inspect workflow state without any command controls',async()=>{
 role='reader';posts.length=0;failRead=false;vi.mocked(api).mockReset();
 vi.mocked(api).mockImplementation(async(path)=>{
  if(path==='/api/v1/context')return {schemaVersion:1,tenantId:'tenant',tenantName:'Test',timezone:'UTC',actorId:'actor',role:'reader'} as any;
  if(path==='/api/v1/fulfillment/orders')return {items:[{id:'o1',customerReference:'reader-order',state:'open',sourceSystem:'test',externalId:'demand'}],nextCursor:null} as any;
  if(path==='/api/v1/fulfillment/order')return {order:{id:'o1',customerReference:'reader-order',state:'open'},lines:[]} as any;
  return {items:[],nextCursor:null} as any;
 });render(<SessionProvider><Fixture/></SessionProvider>);fireEvent.click(screen.getByText('Connect'));await screen.findByText('Open order');fireEvent.click(screen.getByText('Open order'));await screen.findByText('Order demand · open');
 for(const label of ['Create order','Allocate stock','Confirm dispatch','Source reference'])expect(screen.queryByText(label)).toBeNull();
});
