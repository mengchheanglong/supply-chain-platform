const {randomUUID,randomBytes}=require('node:crypto');
const {createApplication}=require('../apps/api/dist/app');
const {Database,migrate,tokenHash}=require('@supply-chain/operations');
async function fixture(cardinality=1000) {
 if(!process.env.TEST_DATABASE_URL||!process.env.TEST_ADMIN_URL)throw new Error('Use the disposable database runner');
 const app=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100,poolMax:8});
 const db=app.get(Database);
 try {
  await migrate(db.pool);const actors=[];
  for(let index=0;index<2;index++) {
   const token=randomBytes(32).toString('base64url'),tenantId=randomUUID(),actorId=randomUUID();
   await db.pool.query("INSERT INTO public.sc_tenants(id,name,timezone)VALUES($1,$2,'UTC')",[tenantId,'Synthetic '+index]);
   await db.pool.query("INSERT INTO public.sc_api_keys(id,tenant_id,token_hash,role)VALUES($1,$2,$3,'operator')",[actorId,tenantId,tokenHash(token)]);
   const actor={tenantId,actorId,token,role:'operator'};actors.push(actor);
   await db.transaction(actor,async client=>client.query(`INSERT INTO public.sc_facilities
    (id,tenant_id,code,name,kind,timezone,latitude,longitude,location_source,source_system,external_id)
    SELECT gen_random_uuid(),$1,'WH-'||lpad(n::text,6,'0'),'Synthetic warehouse','warehouse','UTC',0,0,'estimated','synthetic-test',n::text
    FROM generate_series(1,$2::int)n`,[tenantId,cardinality]));
  }
  await app.listen(0,'127.0.0.1');return {app,db,actors,url:await app.getUrl()};
 }catch(error){await app.close();throw error;}
}
module.exports={fixture};
