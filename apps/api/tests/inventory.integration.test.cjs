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
 const f=await call('facilities',who,{code,name:'Synthetic inventory warehouse',kind:'warehouse',timezone:'UTC',latitude:0,longitude:0,locationSource:'estimated',sourceSystem:'inventory-test',externalId:code});assert.equal(f.status,201);
 const s=await call('skus',who,{code,name:'Synthetic inventory SKU',unit,quantityPrecision,sourceSystem:'inventory-test',externalId:code});assert.equal(s.status,201);
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
 a=await actor('Synthetic inventory A');b=await actor('Synthetic inventory B');reader=await actor('Synthetic inventory reader',a.tenantId,'reader');
 await app.listen(0,'127.0.0.1');url=await app.getUrl();
 second=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100});await second.listen(0,'127.0.0.1');otherUrl=await second.getUrl();
});
after(async()=>{await second?.close();await app?.close();await admin?.end();});
test('receive/reserve/release/ship conserve physical stock and replay the original result',async()=>{
 const key=await stock(),receive=command(key,'10.00');
 const first=await call('inventory/receive',a,receive);assert.equal(first.status,201);assert.equal(first.body.stock.available,'10');
 assert.deepEqual((await call('inventory/receive',a,{...receive,quantity:'10'})).body,first.body);
 const reserve=await call('inventory/reserve',a,command(key,'4'));assert.equal(reserve.status,201);assert.equal(reserve.body.stock.onHand,'10');assert.equal(reserve.body.stock.available,'6');
 const ship={...source(),reservationId:reserve.body.reservationId};const shipped=await call('inventory/ship',a,ship);assert.equal(shipped.status,201);assert.equal(shipped.body.stock.onHand,'6');assert.equal(shipped.body.stock.reserved,'0');
 assert.deepEqual((await call('inventory/ship',a,ship)).body,shipped.body);
 assert.equal((await call('inventory/release',a,{...source(),reservationId:ship.reservationId})).status,409);
 const hold=await call('inventory/reserve',a,command(key,'2'));const release={...source(),reservationId:hold.body.reservationId};
 const released=await call('inventory/release',a,release);assert.equal(released.status,201);assert.equal(released.body.stock.onHand,'6');assert.equal(released.body.stock.available,'6');assert.equal(released.body.movementId,null);
 assert.deepEqual((await call('inventory/release',a,release)).body,released.body);
 assert.equal((await call('inventory/ship',a,{...source(),reservationId:release.reservationId})).status,409);
 assert.deepEqual((await call('inventory/receive',a,receive)).body,first.body,'Replay is a historical result, not a current-stock query');
 const ledger=await call('inventory/movements'+query(key));assert.deepEqual(ledger.body.items.map(x=>x.delta).sort(),['-4','10']);
 await reconcile(key);
});
test('exact fractional and large quantities reject precision, unit and bound violations',async()=>{
 const key=await stock(a,'kg',3);
 for(const q of ['0.1','0.2'])assert.equal((await call('inventory/receive',a,command(key,q))).status,201);
 assert.equal((await balance(key)).onHand,'0.300');
 for(const q of [0.1,'0','-1','01','1e2','0.0001','1.1234567'])assert.equal((await call('inventory/receive',a,command(key,q))).status,400,String(q));
 assert.equal((await call('inventory/reserve',a,{...command(key,'0.1'),unit:'each'})).status,400);
 const large=await stock(a,'kg',6);
 assert.equal((await call('inventory/receive',a,command(large,'999999999999.999999'))).status,201);
 assert.equal((await balance(large)).onHand,'999999999999.999999');
 assert.equal((await call('inventory/receive',a,command(large,'0.000001'))).status,409);
 await reconcile(key);await reconcile(large);
});
test('duplicate concurrent commands across API instances commit one ledger, audit and result',async()=>{
 const key=await stock(),input=command(key,'20');
 const results=await Promise.all(Array.from({length:20},(_,i)=>call('inventory/receive',a,{...input,idempotencyKey:i%2?input.idempotencyKey.toUpperCase():input.idempotencyKey},i%2?otherUrl:url)));
 assert.ok(results.every(x=>x.status===201));assert.ok(results.every(x=>x.body.movementId===results[0].body.movementId));
 assert.equal((await balance(key)).onHand,'20');
 const counts=await db.transaction(a,async tx=>(await tx.query(`SELECT
  (SELECT count(*) FROM public.sc_inventory_movements WHERE idempotency_key=$1)::int AS movements,
  (SELECT count(*) FROM public.sc_audit_events WHERE idempotency_key=$1)::int AS audits,
  (SELECT count(*) FROM public.sc_inventory_commands WHERE idempotency_key=$1)::int AS commands`,[input.idempotencyKey])).rows[0]);
 assert.deepEqual(counts,{movements:1,audits:1,commands:1});
 assert.equal((await call('inventory/receive',a,{...input,quantity:'21'})).status,409);
 assert.equal((await call('inventory/receive',a,{...input,idempotencyKey:randomUUID()})).status,409,'Same source event cannot be applied under a new key');
 assert.equal((await balance(key)).onHand,'20');await reconcile(key);
});
test('competing reservations cannot oversell stock and ship/release races have one winner',async()=>{
 const key=await stock();await call('inventory/receive',a,command(key,'7'));
 const holds=await Promise.all(Array.from({length:18},(_,i)=>call('inventory/reserve',a,command(key,'1'),i%2?otherUrl:url)));
 assert.equal(holds.filter(x=>x.status===201).length,7);assert.equal(holds.filter(x=>x.status===409).length,11);
 assert.equal((await balance(key)).available,'0');
 const id=holds.find(x=>x.status===201).body.reservationId;
 const race=await Promise.all([call('inventory/ship',a,{...source(),reservationId:id}),call('inventory/release',a,{...source(),reservationId:id},otherUrl)]);
 assert.deepEqual(race.map(x=>x.status).sort(),[201,409]);await reconcile(key);
 const terminal=await Promise.all(Array.from({length:12},(_,i)=>call('inventory/ship',a,{...source(),reservationId:id},i%2?otherUrl:url)));
 assert.ok(terminal.every(x=>x.status===409));await reconcile(key);
});
test('tenant and role rejection protects stock, command history, reservation references and cursors',async()=>{
 const key=await stock(),input=command(key,'3');await call('inventory/receive',a,input);
 assert.equal((await call('inventory/receive',reader,command(key,'1'))).status,403);
 assert.equal((await call('inventory/balance'+query(key),reader)).status,200);
 assert.equal((await call('inventory/receive',b,{...input,idempotencyKey:randomUUID()})).status,404);
 assert.equal((await call('inventory/balance'+query(key),b)).status,404);
 assert.equal((await call('inventory/receive',a,{...command(key,'1'),tenantId:b.tenantId})).status,400);
 const r=await call('inventory/reserve',a,command(key,'1'));
 assert.equal((await call('inventory/ship',b,{...source(),reservationId:r.body.reservationId})).status,404);
 const ownB=await stock(b);assert.equal((await call('inventory/receive',b,{...command(ownB,'1'),idempotencyKey:input.idempotencyKey})).status,201,'Keys are tenant-scoped');
 for(const table of ['balances','commands','reservations','movements'])assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM public.sc_inventory_'+table)).rows[0].n,0);
 await assert.rejects(db.transaction(b,tx=>tx.query(`INSERT INTO public.sc_inventory_balances(tenant_id,facility_id,sku_id,unit,quantity_precision) VALUES($1,$2,$3,'each',0)`,[a.tenantId,key.facilityId,key.skuId])),/row-level security/);
});
test('inventory pages are bounded and stock/resource scoped; reconciliation detects corruption',async()=>{
 const key=await stock();await call('inventory/receive',a,command(key,'5'));
 for(let i=0;i<3;i++)await call('inventory/reserve',a,command(key,'1'));
 const first=await call('inventory/reservations'+query(key)+'&limit=2');assert.equal(first.status,200);assert.equal(first.body.items.length,2);
 const next=await call('inventory/reservations'+query(key)+'&limit=2&cursor='+first.body.nextCursor);assert.equal(next.body.items.length,1);assert.equal(next.body.nextCursor,null);
 assert.equal(new Set([...first.body.items,...next.body.items].map(x=>x.id)).size,3);
 const another=await stock();assert.equal((await call('inventory/reservations'+query(another)+'&cursor='+first.body.nextCursor)).status,400);
 assert.equal((await call('inventory/movements'+query(key)+'&cursor='+first.body.nextCursor)).status,400);
 for(const suffix of ['&limit=201','&cursor=bad','&limit=1&limit=2'])assert.equal((await call('inventory/reservations'+query(key)+suffix)).status,400);
 await reconcile(key);
 await db.transaction(a,tx=>tx.query('UPDATE public.sc_inventory_balances SET on_hand=on_hand+1 WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3',[a.tenantId,key.facilityId,key.skuId]));
 assert.equal((await call('inventory/reconciliation'+query(key))).body.consistent,false);
 await db.transaction(a,tx=>tx.query('UPDATE public.sc_inventory_balances SET on_hand=on_hand-1 WHERE tenant_id=$1 AND facility_id=$2 AND sku_id=$3',[a.tenantId,key.facilityId,key.skuId]));
 await reconcile(key);
});
test('audit failure rolls back every stock artifact and the same command can then succeed',async()=>{
 const key=await stock(),input=command(key,'9');
 await assert.rejects(db.transaction(a,async tx=>{await app.get(InventoryService).executeIn(tx,a,'receive',input);throw new Error('Synthetic caller rollback');}),/caller rollback/);
 assert.equal((await balance(key)).onHand,'0');
 assert.equal((await call('inventory/movements'+query(key))).body.items.length,0);
 await admin.query(`CREATE FUNCTION public.inventory_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END $$;
 CREATE TRIGGER inventory_test_failure BEFORE INSERT ON public.sc_audit_events FOR EACH ROW EXECUTE FUNCTION public.inventory_test_failure();`);
 try{assert.equal((await call('inventory/receive',a,input)).status,503);}
 finally{await admin.query('DROP TRIGGER inventory_test_failure ON public.sc_audit_events; DROP FUNCTION public.inventory_test_failure()');}
 assert.equal((await balance(key)).onHand,'0');
 const count=await db.transaction(a,async tx=>(await tx.query('SELECT count(*)::int AS n FROM public.sc_inventory_commands WHERE idempotency_key=$1',[input.idempotencyKey])).rows[0].n);assert.equal(count,0);
 assert.equal((await call('inventory/movements'+query(key))).body.items.length,0);
 assert.equal((await call('inventory/receive',a,input)).status,201);await reconcile(key);
 // Fail a shipment after it has inserted its movement and changed reservation/balance.
 const hold=await call('inventory/reserve',a,command(key,'2')),ship={...source(),reservationId:hold.body.reservationId};
 await admin.query(`CREATE FUNCTION public.inventory_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic audit failure'; END $$;
 CREATE TRIGGER inventory_test_failure BEFORE INSERT ON public.sc_audit_events FOR EACH ROW EXECUTE FUNCTION public.inventory_test_failure();`);
 try{assert.equal((await call('inventory/ship',a,ship)).status,503);}
 finally{await admin.query('DROP TRIGGER inventory_test_failure ON public.sc_audit_events; DROP FUNCTION public.inventory_test_failure()');}
 assert.equal((await balance(key)).onHand,'9');assert.equal((await balance(key)).reserved,'2');
 assert.equal((await call('inventory/ship',a,ship)).status,201);await reconcile(key);
});
test('ledger/results are append-only, reservations cannot be rewritten and insufficient commands leave no result',async()=>{
 const key=await stock();await call('inventory/receive',a,command(key,'2'));const reserve=await call('inventory/reserve',a,command(key,'1'));
 for(const table of ['sc_inventory_movements','sc_inventory_commands']) {
  await assert.rejects(db.transaction(a,tx=>tx.query('DELETE FROM public.'+table)),/append-only/);
  await assert.rejects(db.transaction(a,tx=>tx.query('UPDATE public.'+table+' SET source_system=source_system')),/append-only/);
 }
 await assert.rejects(db.transaction(a,tx=>tx.query('UPDATE public.sc_inventory_reservations SET quantity=2 WHERE id=$1',[reserve.body.reservationId])),/Invalid reservation transition/);
 const input=command(key,'2');assert.equal((await call('inventory/reserve',a,input)).status,409);
 await call('inventory/receive',a,command(key,'1'));assert.equal((await call('inventory/reserve',a,input)).status,201,'Only successful results are retained');
 await reconcile(key);
});
