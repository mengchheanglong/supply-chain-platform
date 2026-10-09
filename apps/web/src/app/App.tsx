import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@supply-chain/api-client';
import { useSession } from './session';
import Connect from '../features/identity/Connect';
const Integrations = lazy(()=>import('../features/integrations/Page'));
const Fulfillment = lazy(()=>import('../features/fulfillment/Page'));
const Facilities = lazy(()=>import('../features/facilities/Page'));
const Inventory = lazy(()=>import('../features/inventory/Page'));
const Catalog = lazy(()=>import('../features/catalog/Page'));
export function App() {
  const {session,disconnect} = useSession(), location=useLocation();
  const ready = useQuery({queryKey:['health'],queryFn:({signal})=>api('/api/health/ready','get',{signal}),refetchInterval:10000});
  const title = location.pathname==='/integrations'?'Data exchange':location.pathname==='/fulfillment'?'Fulfillment & shipping':location.pathname==='/inventory'?'Inventory':location.pathname==='/skus'?'SKU master':'Facilities';
  return <div className="shell"><aside><div className="brand">SC<span>OPERATIONS</span></div><h2>Supply Chain<br/>Operations Platform</h2><p>Warehouse & distribution</p>
    <nav aria-label="Operations"><NavLink to="/facilities">Facilities</NavLink><NavLink to="/skus">SKU master</NavLink><NavLink to="/inventory">Inventory</NavLink><NavLink to="/fulfillment">Fulfillment & shipping</NavLink><NavLink to="/integrations">Data exchange</NavLink></nav><div className="scope">Foundation release<br/>Inventory and fulfillment workflows</div></aside>
    <main><header><div><p className="eyebrow">OPERATIONS / {location.pathname==='/integrations'?'DATA EXCHANGE':location.pathname==='/fulfillment'?'FULFILLMENT':location.pathname==='/inventory'?'INVENTORY':'MASTER DATA'}</p><h1>{title}</h1><p>{location.pathname==='/integrations'?'Validate external data and export authorized records.':location.pathname==='/fulfillment'?'Fulfill demand and record shipment progress.':location.pathname==='/inventory'?'Record stock movements and manage reservations.':'Maintain the operational network and stock-keeping definitions.'}</p></div>
      <span role="status" className={'badge '+(ready.data?.status==='ready'&&!ready.isError?'ready':'unavailable')}>{ready.data?.status==='ready'&&!ready.isError?'Database ready':'API or database unavailable'}</span></header>
    {!session?<Connect/>:<><div className="tenant"><div><strong>{session.actor.tenantName}</strong><span>{session.actor.role} · {session.actor.timezone}</span></div><button className="secondary" onClick={disconnect}>Disconnect</button></div>
      <Suspense fallback={<p role="status">Loading workspace…</p>}><Routes>
        <Route path="/integrations" element={<Integrations key={session.id}/>}/><Route path="/fulfillment" element={<Fulfillment key={session.id}/>}/><Route path="/inventory" element={<Inventory key={session.id}/>}/><Route path="/facilities" element={<Facilities key={session.id}/>}/><Route path="/skus" element={<Catalog key={session.id}/>}/><Route path="*" element={<Navigate to="/facilities" replace/>}/>
      </Routes></Suspense></>}
    <footer>Operational records stay separate from simulation scenarios. Stock changes are authorized and recorded transactionally.</footer></main></div>;
}
