const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const {Pool}=require('pg');
const {createApplication}=require('../dist/app');
const {Database,migrate,tokenHash,InventoryService}=require('@supply-chain/operations');
let app,second,db,admin,url,otherUrl,a,b,reader;
async function actor(name,tenantId=randomUUID(),role='operator') {
 const id=randomUUID(),token=randomBytes(32).toString('base64url');
 await db.pool.query("INSERT INTO public.sc_tenants(id,name,timezone)VALUES($1,$2,'UTC')ON CONFLICT DO NOTHING",[tenantId,name]);
 await db.pool.query('INSERT INTO public.sc_api_keys(id,tenant_id,token_hash,role)VALUES($1,$2,$3,$4)',[id,tenantId,tokenHash(token),role]);
 return {tenantId,actorId:id,role,token};
}
async function call(path,who=a,body,base=url) {
 const response=await fetch(base+'/api/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+who.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,body:await response.json()};
}
async function stock(who=a,unit='each',quantityPrecision=0) {
 const code=randomUUID();
 const f=await call('facilities',who,{code,name:'Synthetic workflow warehouse',kind:'warehouse',timezone:'UTC',latitude:0,longitude:0,locationSource:'estimated',sourceSystem:'inventory-test',externalId:code});assert.equal(f.status,201);
 const s=await call('skus',who,{code,name:'Synthetic workflow SKU',unit,quantityPrecision,sourceSystem:'inventory-test',externalId:code});assert.equal(s.status,201);
 return {facilityId:f.body.id,skuId:s.body.id,unit};
}
const source=()=>({idempotencyKey:randomUUID(),sourceSystem:'inventory-test',externalId:randomUUID()});
const command=(key,quantity)=>({...key,...source(),quantity});
const query=key=>'?facilityId='+key.facilityId+'&skuId='+key.skuId;
async function balance(key,who=a) { const result=await call('inventory/balance'+query(key),who);assert.equal(result.status,200);return result.body.stock; }
async function reconcile(key,who=a) {const r=await call('inventory/reconciliation'+query(key),who);assert.equal(r.status,200);assert.equal(r.body.consistent,true);return r.body;}
before(async()=>{
 assert.ok(process.env.TEST_DATABASE_URL,'Use pnpm test:integration');
 app=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100});db=app.get(Database);
 admin=new Pool({connectionString:process.env.TEST_ADMIN_URL});await migrate(db.pool);await migrate(db.pool);
 a=await actor('Synthetic workflow A');b=await actor('Synthetic workflow B');reader=await actor('Synthetic workflow reader',a.tenantId,'reader');
 await app.listen(0,'127.0.0.1');url=await app.getUrl();
 second=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100});await second.listen(0,'127.0.0.1');otherUrl=await second.getUrl();
});
after(async()=>{await second?.close();await app?.close();await admin?.end();});
async function success(path,body,who=a,base=url) {const r=await call(path,who,body,base);assert.equal(r.status,201,JSON.stringify(r.body));return r.body;}
async function order(quantity='10',key,who=a) {
 key??=await stock(who);const input={...source(),facilityId:key.facilityId,customerReference:'synthetic-customer',lines:[{skuId:key.skuId,quantity,unit:key.unit}]};
 const receipt=await success('fulfillment/orders',input,who);return {key,input,...receipt,line:(await call('fulfillment/order?orderId='+receipt.orderId,who)).body.lines[0]};
}
async function allocate(o,quantity,who=a) {return success('fulfillment/allocate',{...source(),orderId:o.orderId,lineId:o.line.id,quantity},who);}
async function packed(o,quantity='4') {const held=await allocate(o,quantity);await success('fulfillment/pick',{...source(),allocationId:held.allocationId});await success('fulfillment/pack',{...source(),allocationId:held.allocationId});return held;}
async function shipment(held) {return success('shipping/create',{...source(),allocationId:held.allocationId});}
async function detail(o) {const r=await call('fulfillment/order?orderId='+o.orderId);assert.equal(r.status,200);return r.body;}
async function allocations(o) {return (await call('fulfillment/allocations?orderId='+o.orderId)).body.items;}
async function shipments(o) {return (await call('shipping/shipments?orderId='+o.orderId)).body.items;}
test('partial orders conserve demand and stock through pick, pack, dispatch and evidenced delivery',async()=>{
 const o=await order();await success('inventory/receive',command(o.key,'10'));
 const held=await packed(o),draft=await shipment(held);assert.equal((await balance(o.key)).onHand,'10');assert.equal((await balance(o.key)).reserved,'4');
 assert.equal((await call('fulfillment/cancel-allocation',a,{...source(),allocationId:held.allocationId})).status,409);
 const input={...source(),shipmentId:draft.shipmentId},dispatched=await success('shipping/dispatch',input);
 assert.equal((await balance(o.key)).onHand,'6');assert.equal((await balance(o.key)).reserved,'0');
 const first=await detail(o);assert.equal(first.order.state,'partially_shipped');assert.equal(first.lines[0].shipped,'4');assert.equal(first.lines[0].remaining,'6');
 assert.deepEqual(await success('shipping/dispatch',input),dispatched);assert.equal((await call('shipping/cancel',a,{...source(),shipmentId:draft.shipmentId})).status,409);
 const delivery={...source(),shipmentId:draft.shipmentId,observedAt:new Date().toISOString()};const delivered=await success('shipping/deliver',delivery);assert.equal(delivered.state,'delivered');assert.deepEqual(await success('shipping/deliver',delivery),delivered);
 const rest=await packed(o,'6'),secondDraft=await shipment(rest);await success('shipping/dispatch',{...source(),shipmentId:secondDraft.shipmentId});
 assert.equal((await detail(o)).order.state,'fulfilled');assert.equal((await detail(o)).lines[0].shipped,'10');assert.equal((await balance(o.key)).onHand,'0');
 assert.equal((await shipments(o)).filter(row=>row.state==='delivered').length,1,'Order fulfillment means dispatched, not observed delivery');await reconcile(o.key);
});
test('workflow-owned reservations reject direct inventory bypass; cancellation restores stock and demand',async()=>{
 const o=await order('5');await success('inventory/receive',command(o.key,'5'));const held=await packed(o,'3'),allocation=(await allocations(o))[0];
 for(const action of ['release','ship'])assert.equal((await call('inventory/'+action,a,{...source(),reservationId:allocation.reservationId})).status,409);
 assert.equal((await call('inventory/release',a,{...source(),reservationId:allocation.reservationId,ownerType:'fulfillment',ownerId:held.allocationId})).status,400);
 const reservations=(await call('inventory/reservations'+query(o.key))).body.items;assert.equal(reservations[0].ownerType,'fulfillment');assert.equal(reservations[0].ownerId,held.allocationId);
 const draft=await shipment(held);await success('shipping/cancel',{...source(),shipmentId:draft.shipmentId});const again=await shipment(held);assert.notEqual(again.shipmentId,draft.shipmentId);
 await success('shipping/cancel',{...source(),shipmentId:again.shipmentId});await success('fulfillment/cancel-allocation',{...source(),allocationId:held.allocationId});
 assert.equal((await balance(o.key)).available,'5');assert.equal((await detail(o)).lines[0].remaining,'5');
 await success('fulfillment/cancel-order',{...source(),orderId:o.orderId});assert.equal((await detail(o)).order.state,'cancelled');
 assert.equal((await call('fulfillment/allocate',a,{...source(),orderId:o.orderId,lineId:o.line.id,quantity:'1'})).status,409);await reconcile(o.key);
});
test('competing allocations across API instances enforce demand as well as available stock',async()=>{
 const o=await order('7');await success('inventory/receive',command(o.key,'20'));
 const results=await Promise.all(Array.from({length:18},(_,i)=>call('fulfillment/allocate',a,{...source(),orderId:o.orderId,lineId:o.line.id,quantity:'1'},i%2?otherUrl:url)));
 assert.equal(results.filter(r=>r.status===201).length,7);assert.equal(results.filter(r=>r.status===409).length,11);assert.equal((await balance(o.key)).reserved,'7');assert.equal((await detail(o)).lines[0].allocated,'7');
 const other=await order('20',o.key);const stockRace=await Promise.all(Array.from({length:20},(_,i)=>call('fulfillment/allocate',a,{...source(),orderId:other.orderId,lineId:other.line.id,quantity:'1'},i%2?otherUrl:url)));
 assert.equal(stockRace.filter(r=>r.status===201).length,13);assert.equal(stockRace.filter(r=>r.status===409).length,7);assert.equal((await balance(o.key)).available,'0');await reconcile(o.key);
});
test('normalized retries commit once and dispatch/cancel races cannot double-consume',async()=>{
 const o=await order('6');await success('inventory/receive',command(o.key,'6'));
 const input={...source(),orderId:o.orderId,lineId:o.line.id,quantity:'4.00'};
 const results=await Promise.all(Array.from({length:12},(_,i)=>call('fulfillment/allocate',a,{...input,quantity:i%2?'4':'4.00'},i%2?otherUrl:url)));
 assert.ok(results.every(r=>r.status===201));assert.equal(new Set(results.map(r=>r.body.allocationId)).size,1);assert.equal((await balance(o.key)).reserved,'4');
 assert.equal((await call('fulfillment/allocate',a,{...input,quantity:'5'})).status,409);assert.equal((await call('fulfillment/allocate',a,{...input,idempotencyKey:randomUUID()})).status,409);
 const held=results[0].body;await success('fulfillment/pick',{...source(),allocationId:held.allocationId});await success('fulfillment/pack',{...source(),allocationId:held.allocationId});const draft=await shipment(held);
 const race=await Promise.all([call('shipping/dispatch',a,{...source(),shipmentId:draft.shipmentId}),call('shipping/cancel',a,{...source(),shipmentId:draft.shipmentId},otherUrl)]);assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
 if(race[0].status===201){assert.equal((await balance(o.key)).onHand,'2');assert.equal((await detail(o)).lines[0].shipped,'4');}
 else{assert.equal((await balance(o.key)).onHand,'6');assert.equal((await detail(o)).lines[0].shipped,'0');}
 await reconcile(o.key);
});
test('invalid transitions and delivery evidence reject without changing stock',async()=>{
 const o=await order('3');await success('inventory/receive',command(o.key,'3'));const held=await allocate(o,'2');
 assert.equal((await call('fulfillment/pack',a,{...source(),allocationId:held.allocationId})).status,409);assert.equal((await call('shipping/create',a,{...source(),allocationId:held.allocationId})).status,409);
 await success('fulfillment/pick',{...source(),allocationId:held.allocationId});await success('fulfillment/pack',{...source(),allocationId:held.allocationId});const draft=await shipment(held);
 assert.equal((await call('shipping/deliver',a,{...source(),shipmentId:draft.shipmentId,observedAt:new Date().toISOString()})).status,409);await success('shipping/dispatch',{...source(),shipmentId:draft.shipmentId});
 for(const observedAt of ['invalid','2020-01-01T00:00:00Z','2026-02-31T00:00:00Z',new Date(Date.now()+600000).toISOString()])assert.equal((await call('shipping/deliver',a,{...source(),shipmentId:draft.shipmentId,observedAt})).status,400);
 assert.equal((await call('fulfillment/cancel-order',a,{...source(),orderId:o.orderId})).status,409);assert.equal((await balance(o.key)).onHand,'1');await reconcile(o.key);
});
test('shipping audit failure rolls back ledger, demand, allocation, shipment and command receipts',async()=>{
 const o=await order('5');await success('inventory/receive',command(o.key,'5'));const held=await packed(o,'2'),draft=await shipment(held),input={...source(),shipmentId:draft.shipmentId};
 await admin.query(`CREATE FUNCTION public.workflow_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type='shipment' THEN RAISE EXCEPTION 'Synthetic shipment audit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER workflow_test_failure BEFORE INSERT ON public.sc_audit_events FOR EACH ROW EXECUTE FUNCTION public.workflow_test_failure();`);
 try{assert.equal((await call('shipping/dispatch',a,input)).status,503);}finally{await admin.query('DROP TRIGGER workflow_test_failure ON public.sc_audit_events; DROP FUNCTION public.workflow_test_failure()');}
 assert.equal((await balance(o.key)).onHand,'5');assert.equal((await balance(o.key)).reserved,'2');assert.equal((await detail(o)).lines[0].shipped,'0');assert.equal((await allocations(o))[0].state,'packed');assert.equal((await shipments(o))[0].state,'draft');
 const counts=await db.transaction(a,async tx=>(await tx.query('SELECT (SELECT count(*) FROM public.sc_shipping_commands WHERE idempotency_key=$1)::int AS commands,(SELECT count(*) FROM public.sc_inventory_movements WHERE reservation_id=$2)::int AS movements',[input.idempotencyKey,(await allocations(o))[0].reservationId])).rows[0]);assert.deepEqual(counts,{commands:0,movements:0});
 await success('shipping/dispatch',input);assert.equal((await balance(o.key)).onHand,'3');await reconcile(o.key);
});
test('tenant, reader and cursor isolation protects workflow records and strict nested inputs',async()=>{
 const o=await order('5');await success('inventory/receive',command(o.key,'5'));const held=await packed(o,'2'),draft=await shipment(held);
 for(const route of ['fulfillment/order','fulfillment/allocations','shipping/shipments'])assert.equal((await call(route+'?orderId='+o.orderId,b)).status,404);
 assert.equal((await call('fulfillment/order?orderId='+o.orderId,reader)).status,200);
 assert.equal((await call('fulfillment/allocate',reader,{...source(),orderId:o.orderId,lineId:o.line.id,quantity:'1'})).status,403);assert.equal((await call('shipping/dispatch',reader,{...source(),shipmentId:draft.shipmentId})).status,403);assert.equal((await call('shipping/dispatch',b,{...source(),shipmentId:draft.shipmentId})).status,404);
 for(const lines of [[],[...o.input.lines,...o.input.lines],[{...o.input.lines[0],quantity:1}],[{...o.input.lines[0],tenantId:b.tenantId}]])assert.equal((await call('fulfillment/orders',a,{...o.input,...source(),lines})).status,400);
 assert.equal((await call('fulfillment/orders',a,{...o.input,...source(),tenantId:b.tenantId})).status,400);
 await order('1');const page=await call('fulfillment/orders?limit=1');assert.equal(page.body.items.length,1);assert.ok(page.body.nextCursor);assert.equal((await call('fulfillment/orders?cursor='+page.body.nextCursor,b)).status,400);assert.equal((await call('shipping/shipments?orderId='+o.orderId+'&cursor='+page.body.nextCursor)).status,400);
 for(const table of ['sc_orders','sc_order_lines','sc_allocations','sc_shipments','sc_fulfillment_commands','sc_shipping_commands'])assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM public.'+table)).rows[0].n,0);
 await assert.rejects(db.transaction(a,tx=>tx.query('UPDATE public.sc_allocations SET quantity=99 WHERE id=$1',[held.allocationId])),/Invalid workflow transition/);await assert.rejects(db.transaction(a,tx=>tx.query('DELETE FROM public.sc_fulfillment_commands')),/append-only/);await reconcile(o.key);
});
test('multi-SKU exact demand creation replays independent of line ordering and failed allocation can retry after receipt',async()=>{
 const key=await stock(a,'kg',3),other=await stock(),input={...source(),facilityId:key.facilityId,customerReference:'synthetic-multi',lines:[{skuId:key.skuId,quantity:'0.300',unit:'kg'},{skuId:other.skuId,quantity:'2',unit:'each'}]};
 const created=await success('fulfillment/orders',input);assert.deepEqual(await success('fulfillment/orders',{...input,lines:[input.lines[1],{...input.lines[0],quantity:'0.3'}]}),created);
 const o={...created,key},line=(await detail(o)).lines.find(line=>line.skuId===key.skuId);assert.equal(line.requested,'0.300');
 const hold={...source(),orderId:o.orderId,lineId:line.id,quantity:'0.300'};assert.equal((await call('fulfillment/allocate',a,hold)).status,409);await success('inventory/receive',command(key,'0.3'));await success('fulfillment/allocate',hold);assert.equal((await balance(key)).reserved,'0.300');await reconcile(key);
});
test('bounded allocation/shipment pages and concurrent dispatch retries preserve one physical movement',async()=>{
 const o=await order('4');await success('inventory/receive',command(o.key,'4'));const drafts=[];
 for(let i=0;i<3;i++)drafts.push(await shipment(await packed(o,'1')));
 for(const route of ['fulfillment/allocations','shipping/shipments']) {
  const page=(await call(route+'?orderId='+o.orderId+'&limit=2')).body;assert.equal(page.items.length,2);assert.ok(page.nextCursor);
  const next=(await call(route+'?orderId='+o.orderId+'&limit=2&cursor='+page.nextCursor)).body;assert.equal(next.items.length,1);assert.equal(next.nextCursor,null);
  assert.equal(new Set([...page.items,...next.items].map(row=>row.id)).size,3);
  const other=await order('1');assert.equal((await call(route+'?orderId='+other.orderId+'&cursor='+page.nextCursor)).status,400);
  assert.equal((await call(route+'?orderId='+o.orderId+'&limit=201')).status,400);
 }
 const input={...source(),shipmentId:drafts[0].shipmentId};const results=await Promise.all(Array.from({length:12},(_,i)=>call('shipping/dispatch',a,input,i%2?otherUrl:url)));
 assert.ok(results.every(row=>row.status===201));assert.equal(new Set(results.map(row=>row.body.movementId)).size,1);assert.equal((await balance(o.key)).onHand,'3');assert.equal((await detail(o)).lines[0].shipped,'1');await reconcile(o.key);
});
