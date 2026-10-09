const {spawn}=require('node:child_process');
const {mkdirSync,writeFileSync,unlinkSync}=require('node:fs');
const {resolve}=require('node:path');
const {fixture}=require('./Test-Fixture.cjs');
async function run(){
 const f=await fixture(60);let web;
 try{
  mkdirSync('runtime',{recursive:true});writeFileSync('runtime/browser-qa.json',JSON.stringify({url:'http://127.0.0.1:3191',actors:f.actors}),{mode:0o600});
  web=spawn(process.execPath,[resolve('apps/web/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','3191','--strictPort'],{cwd:resolve('apps/web'),env:{...process.env,PLATFORM_API_ORIGIN:f.url},stdio:['ignore','pipe','pipe'],windowsHide:true});
  web.stdout.pipe(process.stdout);web.stderr.pipe(process.stderr);
  console.log('Disposable browser QA fixture starting on 127.0.0.1:3191. Commands: offline, online, quit.');
  process.stdin.setEncoding('utf8');
  for await(const chunk of process.stdin){
   if(chunk.trim()==='offline')await f.db.pool.query("UPDATE public.sc_schema_migrations SET checksum='unavailable'");
   if(chunk.trim()==='online'){const {migrationFiles}=require('@supply-chain/operations');for(const file of migrationFiles())await f.db.pool.query('UPDATE public.sc_schema_migrations SET checksum=$1 WHERE name=$2',[file.checksum,file.name]);}
   if(chunk.trim()==='quit')break;
   console.log('QA control applied');
  }
 }finally{web?.kill();await f.app.close();try{unlinkSync('runtime/browser-qa.json');}catch{}}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
