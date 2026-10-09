const { readFileSync,writeFileSync,mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { createApplication } = require('../apps/api/dist/app');
const { apiDocument } = require('../apps/api/dist/openapi');
async function run() {
  const {default:openapiTS,astToString} = await import('openapi-typescript');
  const app = await createApplication({connectionString:'postgresql://schema:schema@127.0.0.1:1/schema',host:'127.0.0.1',port:3100});
  try {
    await app.init();
    const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
    const schema = canonical(apiDocument(app));
    const files = {'packages/contracts/openapi/v1.json':JSON.stringify(schema,null,2)+'\n',
      'packages/contracts/src/generated/v1.ts':astToString(await openapiTS(schema))};
    for (const [file,text] of Object.entries(files)) {
      if (process.argv.includes('--check')) {
        if (readFileSync(resolve(file),'utf8') !== text) throw new Error('Stale generated contract: '+file);
      } else { mkdirSync(resolve(file,'..'),{recursive:true});writeFileSync(resolve(file),text); }
    }
    console.log(process.argv.includes('--check')?'Generated contracts are current':'Generated OpenAPI and HTTP types');
  } finally { await app.close(); }
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
