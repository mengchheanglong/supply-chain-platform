const { test,before,after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes,randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { createApplication } = require('../dist/app');
const { migrate } = require('../dist/migrations');
const { Database } = require('../dist/database');
const { tokenHash } = require('../dist/auth');
let app,db,admin,url,a,b,reader;
const facility = (code='WH-1') => ({ code,name:'Synthetic test warehouse',kind:'warehouse',timezone:'Asia/Phnom_Penh',latitude:0,longitude:0,locationSource:'estimated',sourceSystem:'synthetic-test',externalId:code });
const sku = (code='SKU-1') => ({ code,name:'Synthetic test SKU',unit:'each',quantityPrecision:0,sourceSystem:'synthetic-test',externalId:code });
async function provision(name,tenantId=randomUUID(),role='operator') {
  const token=randomBytes(32).toString('base64url'), actorId=randomUUID();
  await db.pool.query("INSERT INTO public.sc_tenants(id,name,timezone) VALUES($1,$2,'UTC') ON CONFLICT(id) DO NOTHING",[tenantId,name]);
  await db.pool.query('INSERT INTO public.sc_api_keys(id,tenant_id,token_hash,role) VALUES($1,$2,$3,$4)',[actorId,tenantId,tokenHash(token),role]);
  return { token,tenantId,actorId,role };
}
async function call(path,credential,body) {
  const response=await fetch(url+'/api/v1/'+path,{ method:body?'POST':'GET',
    headers:{ ...(credential?{ Authorization:'Bearer '+credential.token }:{}),...(body?{ 'Content-Type':'application/json' }:{}) },
    ...(body?{ body:JSON.stringify(body) }:{}) });
  return { status:response.status,body:await response.json() };
}
before(async()=>{
  assert.ok(process.env.TEST_DATABASE_URL,'Use pnpm test:integration');
  app=await createApplication({ connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100 });
  db=app.get(Database);
  admin=new Pool({ connectionString:process.env.TEST_ADMIN_URL });
  await migrate(db.pool);
  await migrate(db.pool);
  a=await provision('Synthetic A');b=await provision('Synthetic B');reader=await provision('Synthetic A reader',a.tenantId,'reader');
  await app.listen(0,'127.0.0.1');url=await app.getUrl();
});
after(async()=>{ if(app) await app.close();if(admin) await admin.end(); });

test('readiness verifies persistence, PostGIS, checksums and restricted role',async()=>{
  const response=await fetch(url+'/api/health/ready');
  assert.equal(response.status,200);assert.deepEqual((await response.json()).checks,{ database:true,postgis:true,migrations:true,restrictedRole:true });
  assert.equal((await db.pool.query('SELECT count(*)::int AS count FROM public.sc_schema_migrations')).rows[0].count,require('../dist/migrations').migrationFiles().length);
  const unsafe=new Database({ connectionString:process.env.TEST_ADMIN_URL,host:'127.0.0.1',port:3100 });
  try { assert.equal((await unsafe.readiness()).status,'unavailable'); }
  finally { await unsafe.onModuleDestroy(); }
});

test('missing, invalid and revoked credentials reject; reader can read but cannot create',async()=>{
  assert.equal((await call('facilities')).status,401);
  assert.equal((await call('facilities',{ token:randomBytes(32).toString('base64url') })).status,401);
  assert.equal((await call('facilities',reader)).status,200);
  assert.equal((await call('facilities',reader,facility('FORBIDDEN'))).status,403);
  const revoked=await provision('Synthetic revoked');
  await db.pool.query('UPDATE public.sc_api_keys SET revoked_at=now() WHERE id=$1',[revoked.actorId]);
  assert.equal((await call('context',revoked)).status,401);
});

test('tenant identities are server-derived and duplicate external identities are scoped',async()=>{
  assert.equal((await call('facilities',a,facility())).status,201);
  assert.equal((await call('facilities',b,facility())).status,201);
  assert.equal((await call('facilities',a,facility())).status,409);
  assert.equal((await call('facilities',a,{ ...facility('OTHER-CODE'),externalId:'WH-1' })).status,409);
  assert.equal((await call('facilities',a,{ ...facility('INJECT'),tenantId:b.tenantId })).status,400);
  const list=await call('facilities?tenantId='+b.tenantId,a);
  assert.equal(list.status,200);assert.equal(list.body.tenantId,a.tenantId);
  assert.equal(list.body.items.length,1);assert.equal(list.body.items[0].tenantId,a.tenantId);
  assert.equal(list.body.items[0].latitude,0);
  const context=await call('context',a);assert.equal(context.body.actorId,a.actorId);
});

test('SKU units and precision reject invalid quantities and do not expose another tenant',async()=>{
  assert.equal((await call('skus',a,sku())).status,201);
  assert.equal((await call('skus',b,sku())).status,201);
  assert.equal((await call('skus',a,{ ...sku('FRACTIONAL'),quantityPrecision:3 })).status,400);
  assert.equal((await call('skus',a,{ ...sku('MALFORMED'),unit:'unknown' })).status,400);
  assert.equal((await call('skus',a,{ ...sku('MASS'),unit:'kg',quantityPrecision:3 })).status,201);
  assert.deepEqual((await call('skus',b)).body.items.map(row=>row.code),['SKU-1']);
  assert.equal((await call('facilities',a,{ ...facility('BAD-TZ'),timezone:'Not/AZone' })).status,400);
  assert.equal((await call('facilities',a,{ ...facility('BAD-GPS'),longitude:181 })).status,400);
});

test('row policies enforce the tenant and pooled transactions leave no tenant scope behind',async()=>{
  assert.equal((await db.pool.query('SELECT count(*)::int AS count FROM public.sc_facilities')).rows[0].count,0);
  await db.transaction(a,async client=>{
    const result=await client.query('SELECT tenant_id FROM public.sc_facilities');
    assert.ok(result.rows.every(row=>row.tenant_id===a.tenantId));
  });
  await assert.rejects(db.transaction(a,client=>client.query(`INSERT INTO public.sc_skus
    (id,tenant_id,code,name,unit,quantity_precision,source_system,external_id) VALUES($1,$2,'INJECT','x','each',0,'synthetic-test','inject')`,[randomUUID(),b.tenantId])),/row-level security/);
  assert.equal((await db.pool.query('SELECT count(*)::int AS count FROM public.sc_skus')).rows[0].count,0);
});

test('concurrent tenant reads through the pool cannot exchange records',async()=>{
  await Promise.all(Array.from({ length:24 },async(_,index)=>{
    const actor=index%2?a:b;
    const result=await call('facilities',actor);
    assert.equal(result.status,200);
    assert.equal(result.body.tenantId,actor.tenantId);
    assert.ok(result.body.items.every(row=>row.tenantId===actor.tenantId));
  }));
});

test('local provisioning creates a real scoped credential, stores only its hash and omits the token from output',async()=>{
  const { execFileSync } = require('node:child_process');
  const { readFileSync,unlinkSync } = require('node:fs');
  const { resolve,dirname,basename } = require('node:path');
  const { projectRoot } = require('../dist/config');
  const output=execFileSync(process.execPath,[resolve(__dirname,'../dist/cli.js'),'tenant:create','Synthetic CLI tenant','UTC'],
    { env:{ ...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL },encoding:'utf8' });
  const file=output.trim().replace('Scoped operator credential saved to ','');
  assert.equal(dirname(file),resolve(projectRoot,'.secrets'));
  assert.match(basename(file),/^[a-f0-9-]+\.json$/);
  try {
    const credential=JSON.parse(readFileSync(file,'utf8'));
    assert.ok(!output.includes(credential.token));
    const context=await call('context',credential);
    assert.equal(context.status,200);
    assert.equal(context.body.tenantId,credential.tenantId);
    assert.equal(context.body.tenantName,'Synthetic CLI tenant');
    const stored=await db.pool.query('SELECT token_hash FROM public.sc_api_keys WHERE id=$1',[credential.actorId]);
    assert.equal(stored.rows[0].token_hash,tokenHash(credential.token));
    assert.notEqual(stored.rows[0].token_hash,credential.token);
  } finally { unlinkSync(file); }
});

test('audit failure rolls back the facility and audit records are append-only',async()=>{
  await admin.query(`CREATE FUNCTION public.test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic failure'; END $$;
    CREATE TRIGGER test_audit_failure BEFORE INSERT ON public.sc_audit_events FOR EACH ROW EXECUTE FUNCTION public.test_audit_failure();`);
  try { assert.equal((await call('facilities',a,facility('ROLLBACK'))).status,503); }
  finally { await admin.query('DROP TRIGGER test_audit_failure ON public.sc_audit_events; DROP FUNCTION public.test_audit_failure()'); }
  assert.ok(!(await call('facilities',a)).body.items.some(row=>row.code==='ROLLBACK'));
  await assert.rejects(db.transaction(a,client=>client.query("UPDATE public.sc_audit_events SET action='created'")),/append-only/);
});

test('migration drift and database loss fail readiness and authenticated writes',async()=>{
  await db.pool.query("UPDATE public.sc_schema_migrations SET checksum='invalid'");
  try {
    assert.equal((await fetch(url+'/api/health/ready')).status,503);
    assert.equal((await call('skus',a,sku('UNREADY'))).status,503);
    await assert.rejects(migrate(db.pool),/missing or changed/);
  } finally {
    const { migrationFiles } = require('../dist/migrations');
    for (const file of migrationFiles()) await db.pool.query('UPDATE public.sc_schema_migrations SET checksum=$1 WHERE name=$2',[file.checksum,file.name]);
  }
  const offline=await createApplication({ connectionString:'postgresql://test:test@127.0.0.1:1/offline',host:'127.0.0.1',port:3100 });
  await offline.listen(0,'127.0.0.1');
  try {
    const base=await offline.getUrl();assert.equal((await fetch(base+'/api/health/ready')).status,503);
    assert.equal((await fetch(base+'/api/health/live')).status,200);
    assert.equal((await fetch(base+'/api/v1/skus',{ method:'POST',headers:{ Authorization:'Bearer '+a.token,'Content-Type':'application/json' },body:JSON.stringify(sku('OFFLINE')) })).status,503);
  } finally { await offline.close(); }
});


test('cursor pages are bounded, stable and tenant/resource scoped; malformed input rejects',async()=>{
  const actor=await provision('Synthetic pagination');
  await db.transaction(actor,async client=>client.query(`INSERT INTO public.sc_facilities
    (id,tenant_id,code,name,kind,timezone,latitude,longitude,location_source,source_system,external_id)
    SELECT gen_random_uuid(),$1,'PAGE-'||lpad(n::text,4,'0'),'Pagination fixture','warehouse','UTC',0,0,'estimated','pagination',n::text
    FROM generate_series(1,425) n`,[actor.tenantId]));
  let cursor,seen=[];
  do {
    const page=await call('facilities?limit=200'+(cursor?'&cursor='+cursor:''),actor);
    assert.equal(page.status,200);assert.ok(page.body.items.length<=200);seen.push(...page.body.items.map(row=>row.code));
    cursor=page.body.nextCursor;
  } while(cursor);
  assert.equal(seen.length,425);assert.equal(new Set(seen).size,425);assert.deepEqual(seen,[...seen].sort());
  const first=await call('facilities?limit=1',actor);
  assert.equal((await call('facilities?cursor='+first.body.nextCursor,b)).status,400);
  assert.equal((await call('skus?cursor='+first.body.nextCursor,actor)).status,400);
  for(const query of ['limit=0','limit=201','limit=1.5','limit=abc','cursor=bad','limit=1&limit=2','cursor=x&cursor=y'])
    assert.equal((await call('facilities?'+query,actor)).status,400,query);
  assert.equal((await call('facilities',actor)).body.items.length,50);
  await db.transaction(actor,async client=>client.query(`INSERT INTO public.sc_skus
    (id,tenant_id,code,name,unit,quantity_precision,source_system,external_id)
    SELECT gen_random_uuid(),$1,'S-'||lpad(n::text,3,'0'),'Pagination fixture','each',0,'pagination',n::text
    FROM generate_series(1,3) n`,[actor.tenantId]));
  const skuPage=await call('skus?limit=2',actor);assert.equal(skuPage.body.items.length,2);
  assert.equal((await call('skus?limit=2&cursor='+skuPage.body.nextCursor,actor)).body.items.length,1);
});

test('Fastify responses preserve cache/failure contracts and use safe generated correlation IDs',async()=>{
  const response=await fetch(url+'/api/v1/facilities',{headers:{'X-Request-Id':'unsafe-user-input'}});
  const body=await response.json();assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(response.headers.get('x-request-id'),/^[a-f0-9-]{36}$/);
  assert.equal(body.correlationId,response.headers.get('x-request-id'));assert.ok(!JSON.stringify(body).includes('unsafe-user-input'));
  const invalid=await fetch(url+'/api/v1/facilities',{method:'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json'},body:'{'});
  assert.equal(invalid.status,400);assert.equal(invalid.headers.get('cache-control'),'no-store');
  const oversized=await fetch(url+'/api/v1/skus',{method:'POST',headers:{Authorization:'Bearer '+a.token,'Content-Type':'application/json'},body:JSON.stringify({padding:'x'.repeat(70000)})});
  assert.equal(oversized.status,413);
  const {apiDocument}=require('../dist/openapi');const schema=apiDocument(app);
  assert.ok(schema.paths['/api/v1/facilities'].get.responses['200'].content['application/json'].schema);
  assert.equal(schema.paths['/api/v1/skus'].post.requestBody.content['application/json'].schema.$ref,'#/components/schemas/CreateSkuDto');
  assert.ok(schema.components.schemas.ErrorDto.properties.error.oneOf);
  const {HttpMetrics}=require('../dist/transport/http/metrics');
  assert.ok(app.get(HttpMetrics).snapshot()['/api/v1/facilities'].count>0);
});
