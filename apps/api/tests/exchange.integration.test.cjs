const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const {Pool}=require('pg');
const {createApplication}=require('../dist/app');
const {Database,migrate,tokenHash,InventoryService,parseCsv,csvDocument}=require('@supply-chain/operations');
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
 const f=await call('facilities',who,{code,name:'Synthetic exchange warehouse',kind:'warehouse',timezone:'UTC',latitude:0,longitude:0,locationSource:'estimated',sourceSystem:'inventory-test',externalId:code});assert.equal(f.status,201);
 const s=await call('skus',who,{code,name:'Synthetic exchange SKU',unit,quantityPrecision,sourceSystem:'inventory-test',externalId:code});assert.equal(s.status,201);
 return {facilityId:f.body.id,skuId:s.body.id,unit};
}
const source=()=>({idempotencyKey:randomUUID(),sourceSystem:'inventory-test',externalId:randomUUID()});
const command=({facilityId,skuId,unit},quantity)=>({facilityId,skuId,unit,...source(),quantity});
const query=key=>'?facilityId='+key.facilityId+'&skuId='+key.skuId;
async function balance(key,who=a) { const result=await call('inventory/balance'+query(key),who);assert.equal(result.status,200);return result.body.stock; }
async function reconcile(key,who=a) {const r=await call('inventory/reconciliation'+query(key),who);assert.equal(r.status,200);assert.equal(r.body.consistent,true);return r.body;}
before(async()=>{
 assert.ok(process.env.TEST_DATABASE_URL,'Use pnpm test:integration');
 app=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100});db=app.get(Database);
 admin=new Pool({connectionString:process.env.TEST_ADMIN_URL});await migrate(db.pool);await migrate(db.pool);
 a=await actor('Synthetic exchange A');b=await actor('Synthetic exchange B');reader=await actor('Synthetic exchange reader',a.tenantId,'reader');
 await app.listen(0,'127.0.0.1');url=await app.getUrl();
 second=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100});await second.listen(0,'127.0.0.1');otherUrl=await second.getUrl();
});
after(async()=>{await second?.close();await app?.close();await admin?.end();});
async function success(path,input,who=a,base=url){const r=await call(path,who,input,base);assert.equal(r.status,201,JSON.stringify(r.body));return r.body;}
async function mapped(who=a,unit='kg',precision=3){
 const key=await stock(who,unit,precision),system='erp-'+randomUUID(),fac='facility-'+randomUUID(),sku='sku-'+randomUUID();
 for(const [entity,sourceExternalId,targetId] of [['facility',fac,key.facilityId],['sku',sku,key.skuId]])await success('integrations/mappings',{...source(),sourceSystem:system,entity,sourceExternalId,targetId},who);
 return {...key,system,fac,sku};
}
const header='record_id,facility_ref,sku_ref,unit,on_hand,reserved,observed_at';
function input(key,overrides={}){return {...source(),sourceSystem:key.system,schemaVersion:1,fileName:'synthetic.csv',csv:header+'\r\n'+[randomUUID(),key.fac,key.sku,key.unit,'0.300','0.100','2026-01-01T00:00:00Z'].join(',')+'\r\n',...overrides};}
async function unchanged(key,work){const before=await db.transaction(a,async tx=>(await tx.query(`SELECT (SELECT count(*) FROM public.sc_inventory_movements)::int AS movements,(SELECT count(*) FROM public.sc_inventory_reservations)::int AS reservations,(SELECT count(*) FROM public.sc_orders)::int AS orders,(SELECT count(*) FROM public.sc_shipments)::int AS shipments`)).rows[0]);const old=await balance(key);await work();assert.deepEqual(await balance(key),old);const after=await db.transaction(a,async tx=>(await tx.query(`SELECT (SELECT count(*) FROM public.sc_inventory_movements)::int AS movements,(SELECT count(*) FROM public.sc_inventory_reservations)::int AS reservations,(SELECT count(*) FROM public.sc_orders)::int AS orders,(SELECT count(*) FROM public.sc_shipments)::int AS shipments`)).rows[0]);assert.deepEqual(after,before);}
test('CSV grammar preserves quoted commas/newlines, rejects malformed fields and exports spreadsheet-safe text',()=>{
 assert.deepEqual(parseCsv('\uFEFFa,b\r\n"x,y","one\n""two"""\r\n'),[['a','b'],['x,y','one\n"two"']]);
 for(const csv of ['a\n"unclosed','a\nwrong"quote','a\n"closed"oops','a\n\0','a\n'+'x'.repeat(1025),'a\n'+Array(201).fill('x').join('\n')])assert.throws(()=>parseCsv(csv));
 const csv=csvDocument([['=cmd',' +formula','@cmd','normal,"quoted"','0.300']]);assert.deepEqual(parseCsv(csv)[0],["'=cmd","' +formula","'@cmd",'normal,"quoted"','0.300']);
});
test('validated imports retain exact quantities, source mappings and lineage without operational changes',async()=>{
 const key=await mapped(),request=input(key);await success('inventory/receive',command(key,'5'));
 await unchanged(key,async()=>{
  const result=await success('integrations/imports',request);assert.equal(result.state,'validated');assert.equal(result.acceptedRows,1);assert.equal(result.planningApproved,false);assert.equal(result.source,'external');assert.equal(result.actorId,a.actorId);assert.equal(result.contentSha256,require('node:crypto').createHash('sha256').update(request.csv).digest('hex'));
  assert.equal(result.records[0].facilityId,key.facilityId);assert.equal(result.records[0].onHand,'0.300');assert.equal(result.records[0].reserved,'0.100');assert.equal(result.records[0].available,'0.200');assert.equal(result.records[0].observedAt,'2026-01-01T00:00:00.000Z');assert.equal(result.csv,null);
  assert.deepEqual((await call('integrations/document?id='+result.id)).body,result);assert.deepEqual(await success('integrations/imports',request),result);
  assert.equal((await call('integrations/imports',a,{...request,csv:request.csv.replace('0.300','0.400')})).status,409);
 });await reconcile(key);
});
test('quality reports reject missing units, precision, conservation, mapping, duplicate and timestamp errors atomically',async()=>{
 const key=await mapped();
 for(const [field,value,code] of [['unit','','UNIT'],['unit','each','UNIT_MISMATCH'],['on_hand','0.0001','QUANTITY'],['on_hand','1e3','QUANTITY'],['reserved','0.4','CONSERVATION'],['facility_ref','unknown','UNMAPPED'],['observed_at','2026-02-31T00:00:00Z','TIMESTAMP'],['observed_at','2999-01-01T00:00:00Z','TIMESTAMP']]){
  const request=input(key),rows=parseCsv(request.csv),index=rows[0].indexOf(field);rows[1][index]=value;request.csv=csvDocument(rows);
  const result=await success('integrations/imports',request);assert.equal(result.state,'rejected',field);assert.equal(result.acceptedRows,0);assert.deepEqual(result.records,[]);assert.ok(result.issues.some(issue=>issue.code===code),JSON.stringify(result.issues));
 }
 const request=input(key),line=parseCsv(request.csv)[1].join(','),duplicate=await success('integrations/imports',{...request,csv:request.csv+line+'\r\n'});assert.ok(duplicate.issues.some(issue=>issue.code==='DUPLICATE'));assert.equal(duplicate.acceptedRows,0);
 for(const csv of ['wrong,header\n1,2',header+'\n"unclosed',header+'\n',header+'\n'+Array(201).fill(line).join('\n')]){const report=await success('integrations/imports',input(key,{csv}));assert.equal(report.state,'rejected');assert.equal(report.acceptedRows,0);}
 assert.equal((await balance(key)).onHand,'0.000');await reconcile(key);
});
test('concurrent retry and cross-file source identity registration accept once across two APIs',async()=>{
 const key=await mapped(),request=input(key);const results=await Promise.all(Array.from({length:12},(_,i)=>call('integrations/imports',a,request,i%2?otherUrl:url)));assert.ok(results.every(result=>result.status===201));assert.equal(new Set(results.map(result=>result.body.id)).size,1);
 const duplicate=await success('integrations/imports',{...request,...source(),sourceSystem:key.system});assert.equal(duplicate.state,'rejected');assert.ok(duplicate.issues.some(issue=>issue.code==='DUPLICATE'));
 const newer=input(key),race=await Promise.all([call('integrations/imports',a,newer),call('integrations/imports',a,{...newer,...source(),sourceSystem:key.system},otherUrl)]);assert.deepEqual(race.map(result=>result.body.state).sort(),['rejected','validated']);
 const counts=await db.transaction(a,async tx=>(await tx.query('SELECT count(*)::int AS n FROM public.sc_import_record_identities WHERE tenant_id=$1 AND source_system=$2',[a.tenantId,key.system])).rows[0]);assert.equal(counts.n,2);
});
test('reader exports are tenant scoped, paged, hashed and stable on replay after stock changes',async()=>{
 const key=await mapped();await success('inventory/receive',command(key,'1.3'));const request={...source(),resource:'stock',facilityId:key.facilityId,skuId:key.skuId};
 let result;await unchanged(key,async()=>{result=await success('integrations/exports',request,reader);});assert.equal(result.state,'exported');assert.equal(result.source,'operational');assert.equal(result.planningApproved,false);assert.equal(result.actorId,reader.actorId);assert.equal(result.contentSha256,require('node:crypto').createHash('sha256').update(result.csv).digest('hex'));assert.ok(result.csv.includes('"1.300"'));
 await success('inventory/receive',command(key,'1'));assert.deepEqual(await success('integrations/exports',request,reader),result);assert.equal((await balance(key)).onHand,'2.300');
 const page=await success('integrations/exports',{...source(),resource:'facilities',limit:'1'},reader);assert.equal(page.totalRows,1);assert.ok(page.nextCursor);assert.equal(parseCsv(page.csv).length,2);assert.ok(page.csv.includes(a.tenantId));assert.ok(!page.csv.includes(b.tenantId));
 const next=await success('integrations/exports',{...source(),resource:'facilities',limit:'1',cursor:page.nextCursor},reader);assert.notEqual(parseCsv(page.csv)[1][1],parseCsv(next.csv)[1][1]);
 assert.equal((await call('integrations/exports',b,{...source(),resource:'facilities',cursor:page.nextCursor})).status,400);assert.equal((await call('integrations/exports',a,{...source(),resource:'skus',cursor:page.nextCursor})).status,400);
 assert.equal((await call('integrations/exports',a,{...source(),resource:'stock',facilityId:key.facilityId,skuId:key.skuId,limit:'2'})).status,400);
});
test('tenant, reader, unknown field and source mapping conflicts are rejected',async()=>{
 const key=await mapped(),request=input(key),doc=await success('integrations/imports',request);
 assert.equal((await call('integrations/imports',reader,input(key))).status,403);assert.equal((await call('integrations/mappings',reader,{...source(),entity:'facility',sourceExternalId:'other',targetId:key.facilityId})).status,403);
 assert.equal((await call('integrations/mappings',b,{...source(),entity:'facility',sourceExternalId:'other',targetId:key.facilityId})).status,404);assert.equal((await call('integrations/document?id='+doc.id,b)).status,404);assert.equal((await call('integrations/exports',b,{...source(),resource:'stock',facilityId:key.facilityId,skuId:key.skuId})).status,404);
 assert.equal((await call('integrations/imports',a,{...input(key),tenantId:b.tenantId})).status,400);assert.equal((await call('integrations/imports',a,input(key,{schemaVersion:2}))).status,400);
 assert.equal((await call('integrations/mappings',a,{...source(),sourceSystem:key.system,entity:'facility',sourceExternalId:key.fac,targetId:key.facilityId})).status,409);
 const other=await mapped(b);assert.equal((await success('integrations/imports',input(other),b)).state,'validated');
 for(const table of ['sc_integration_commands','sc_source_mappings','sc_exchange_documents','sc_import_record_identities'])assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM public.'+table)).rows[0].n,0);
 const page=await call('integrations/documents?limit=1');assert.equal(page.body.items.length,1);assert.ok(page.body.nextCursor);assert.equal((await call('integrations/documents?cursor='+page.body.nextCursor,b)).status,400);assert.equal((await call('integrations/mappings?cursor='+page.body.nextCursor)).status,400);
});
test('late audit failure rolls back document, source identities and receipts; immutable histories cannot change',async()=>{
 const key=await mapped(),request=input(key);
 await admin.query(`CREATE FUNCTION public.exchange_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.entity_type='exchange_document' THEN RAISE EXCEPTION 'Synthetic exchange audit failure'; END IF; RETURN NEW; END $$;CREATE TRIGGER exchange_test_failure BEFORE INSERT ON public.sc_audit_events FOR EACH ROW EXECUTE FUNCTION public.exchange_test_failure();`);
 try{assert.equal((await call('integrations/imports',a,request)).status,503);}finally{await admin.query('DROP TRIGGER exchange_test_failure ON public.sc_audit_events;DROP FUNCTION public.exchange_test_failure()');}
 const counts=await db.transaction(a,async tx=>(await tx.query('SELECT (SELECT count(*) FROM public.sc_exchange_documents WHERE idempotency_key=$1)::int AS documents,(SELECT count(*) FROM public.sc_integration_commands WHERE idempotency_key=$1)::int AS receipts,(SELECT count(*) FROM public.sc_import_record_identities WHERE source_system=$2)::int AS identities',[request.idempotencyKey,key.system])).rows[0]);assert.deepEqual(counts,{documents:0,receipts:0,identities:0});assert.equal((await success('integrations/imports',request)).state,'validated');
 for(const table of ['sc_integration_commands','sc_source_mappings','sc_exchange_documents','sc_import_record_identities'])await assert.rejects(db.transaction(a,tx=>tx.query('DELETE FROM public.'+table)),/append-only/);
});
