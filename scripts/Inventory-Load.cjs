const {randomUUID}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {cpus,totalmem,platform}=require('node:os');
const {writeFileSync,mkdirSync}=require('node:fs');
const {fixture}=require('./Test-Fixture.cjs');
const {createApplication}=require('../apps/api/dist/app');
const {Database}=require('@supply-chain/operations');
async function run(){
 const f=await fixture(1);let second;
 try{
  second=await createApplication({connectionString:process.env.TEST_DATABASE_URL,host:'127.0.0.1',port:3100,poolMax:8});await second.listen(0,'127.0.0.1');const urls=[f.url,await second.getUrl()];
  const source=()=>({idempotencyKey:randomUUID(),sourceSystem:'synthetic-inventory-load',externalId:randomUUID()});
  async function call(path,actor,body,index=0){const response=await fetch(urls[index%2]+'/api/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+actor.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});return {status:response.status,body:await response.json()};}
  async function key(actor){const facilities=await call('facilities',actor),code=randomUUID();const sku=await call('skus',actor,{code,name:'Synthetic hot-stock SKU',unit:'each',quantityPrecision:0,sourceSystem:'synthetic-inventory-load',externalId:code});if(sku.status!==201)throw new Error('SKU fixture failed');return {facilityId:facilities.body.items[0].id,skuId:sku.body.id,unit:'each'};}
  const results=[],a=f.actors[0],b=f.actors[1],other=await key(b);await call('inventory/receive',b,{...other,...source(),quantity:'5'});
  for(const concurrency of [1,8,32]){
   const hot=await key(a);const received=await call('inventory/receive',a,{...hot,...source(),quantity:'50'});if(received.status!==201)throw new Error('Receipt fixture failed');
   let next=0;const holds=[],samples=[],statuses={};const start=performance.now();
   await Promise.all(Array.from({length:concurrency},async()=>{while(next<80){const index=next++,t=performance.now();const result=await call('inventory/reserve',a,{...hot,...source(),quantity:'1'},index);samples.push(performance.now()-t);statuses[result.status]=(statuses[result.status]??0)+1;if(result.status===201)holds.push(result.body);else if(result.status!==409)throw new Error('Unexpected reservation status '+result.status);}}));
   samples.sort((a,b)=>a-b);const percentile=p=>Number(samples[Math.ceil(samples.length*p)-1].toFixed(2));
   if(holds.length!==50||statuses[409]!==30)throw new Error('Overselling/conservation check failed');
   const reserveElapsed=performance.now()-start;
   const ships=holds.map(hold=>({...source(),reservationId:hold.reservationId}));const jobs=[...ships,...ships.slice(0,10)];next=0;
   await Promise.all(Array.from({length:concurrency},async()=>{while(next<jobs.length){const index=next++,result=await call('inventory/ship',a,jobs[index],index);if(result.status!==201)throw new Error('Shipment/replay failed');}}));
   const q='?facilityId='+hot.facilityId+'&skuId='+hot.skuId,reconciled=await call('inventory/reconciliation'+q,a);
   if(!reconciled.body.consistent||reconciled.body.onHand!=='0'||reconciled.body.reserved!=='0')throw new Error('Stock did not reconcile after shipment');
   const counts=await f.db.transaction(a,async tx=>(await tx.query('SELECT count(*)::int AS n FROM public.sc_inventory_movements WHERE facility_id=$1 AND sku_id=$2',[hot.facilityId,hot.skuId])).rows[0].n);if(counts!==51)throw new Error('Shipment applied more than once');
   results.push({concurrency,reservationRequests:80,reserved:50,expectedInsufficientStock:30,unexpectedErrors:0,shipAndReplayRequests:60,physicalMovements:51,finalOnHand:'0',finalReserved:'0',p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),reservationRequestsPerSecond:Number((80*1000/reserveElapsed).toFixed(2))});
  }
  const isolated=await call('inventory/reconciliation?facilityId='+other.facilityId+'&skuId='+other.skuId,b);if(!isolated.body.consistent||isolated.body.onHand!=='5')throw new Error('Other tenant stock changed');
  const report={measuredAt:new Date().toISOString(),environment:{node:process.version,platform:platform(),cpu:cpus()[0].model,logicalCpus:cpus().length,memoryGB:Number((totalmem()/2**30).toFixed(1)),database:'Disposable PostGIS 18/3.6 Docker',apiInstances:2,poolMaxPerInstance:8},workload:{tenants:2,hotKeysPerPhase:1,initialStock:50,quantityPerReservation:1,requestsPerPhase:140,description:'80 competing reserves, 50 shipments and 10 duplicate shipment retries; second tenant remains unchanged'},results,metrics:{first:f.db.metrics,second:second.get(Database).metrics},limitations:['Short local contention baseline; no production SLO','Percentiles cover reservation requests including expected 409 responses','Fresh stock key per phase; no representative historical ledger cardinality']};
  mkdirSync('runtime',{recursive:true});writeFileSync('runtime/inventory-load.json',JSON.stringify(report,null,2));console.log(JSON.stringify({artifact:'runtime/inventory-load.json',results}));
 }finally{await second?.close();await f.app.close();}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
