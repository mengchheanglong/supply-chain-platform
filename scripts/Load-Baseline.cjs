const {performance,monitorEventLoopDelay}=require('node:perf_hooks');
const {cpus,totalmem,platform}=require('node:os');
const {writeFileSync,mkdirSync}=require('node:fs');
const {HttpMetrics}=require('../apps/api/dist/transport/http/metrics');
const {fixture}=require('./Test-Fixture.cjs');
async function run() {
 const f=await fixture(),histogram=monitorEventLoopDelay({resolution:10});histogram.enable();
 const results=[];
 try {
  // Warm both identities and routing before the timed phases.
  for(const actor of f.actors)await fetch(f.url+'/api/v1/facilities?limit=50',{headers:{Authorization:'Bearer '+actor.token}});
  for(const concurrency of [1,8,32]) {
   const samples=[],statuses={};let issued=0,failed=0;const begin=performance.now();
   await Promise.all(Array.from({length:concurrency},async()=>{
    while(issued<300){const sequence=issued++,actor=f.actors[sequence%2],write=sequence%10===0,start=performance.now();
     const response=await fetch(f.url+'/api/v1/facilities'+(write?'':'?limit=50'),{method:write?'POST':'GET',headers:{Authorization:'Bearer '+actor.token,...(write?{'Content-Type':'application/json'}:{})},
      ...(write?{body:JSON.stringify({code:`LOAD-${concurrency}-${sequence}`,name:'Synthetic load warehouse',kind:'warehouse',timezone:'UTC',latitude:0,longitude:0,locationSource:'estimated',sourceSystem:'synthetic-load',externalId:`${concurrency}-${sequence}`})}:{}),signal:AbortSignal.timeout(10000)});
     const body=await response.json();samples.push(performance.now()-start);statuses[response.status]=(statuses[response.status]??0)+1;
     if(response.status!==(write?201:200)||body.tenantId!==actor.tenantId||body.items?.some(row=>row.tenantId!==actor.tenantId))failed++;
    }
   }));
   samples.sort((a,b)=>a-b);const percentile=p=>Number(samples[Math.min(samples.length-1,Math.ceil(samples.length*p)-1)].toFixed(2));
   results.push({concurrency,requests:samples.length,errors:failed,statuses,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),requestsPerSecond:Number((samples.length*1000/(performance.now()-begin)).toFixed(2))});
   if(failed)throw new Error('Load phase violated HTTP/tenant correctness');
  }
  const report={measuredAt:new Date().toISOString(),environment:{node:process.version,platform:platform(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryGB:Number((totalmem()/2**30).toFixed(1)),database:'PostGIS 18 / 3.6 disposable Docker',apiInstances:1,poolMax:8},
   workload:{tenants:2,facilitiesPerTenant:1000,readPercent:90,createPercent:10,pageSize:50,tenantMix:'alternating actors; writes target actor 0'},results,
   metrics:{http:f.app.get(HttpMetrics).snapshot(),database:{...f.db.metrics,poolTotal:f.db.pool.totalCount,poolWaiting:f.db.pool.waitingCount},eventLoopP95Ms:Number((histogram.percentile(95)/1e6).toFixed(2))},
   limitations:['Local baseline, not a production SLO or capacity guarantee','Master-data workload only; inventory contention must be benchmarked in OPS-02','Includes authorization and full readiness checks on every authenticated request']};
  mkdirSync('runtime',{recursive:true});writeFileSync('runtime/architecture-load.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({artifact:'runtime/architecture-load.json',results}));
 }finally{histogram.disable();await f.app.close();}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
