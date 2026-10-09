const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configuration } = require('../dist/config');
test('missing credentials and malformed endpoints fail without exposing secrets', () => {
  assert.throws(()=>configuration({}),/Configure/);
  assert.throws(()=>configuration({ DATABASE_URL:'https://secret:password@example.com/db' }),/PostgreSQL/);
  assert.throws(()=>configuration({ DATABASE_URL:'postgresql://operator:password@localhost/db',API_PORT:'0' }),/API_PORT/);
  assert.throws(()=>configuration({ DATABASE_URL:'postgresql://operator:password@localhost/db',API_PORT:'3100x' }),/API_PORT/);
  assert.throws(()=>configuration({ DB_PASSWORD_FILE:'does-not-exist' }),/unavailable/);
  const env = { DATABASE_URL:'postgresql://operator:password@localhost/db' };
  assert.equal(configuration(env).host,'127.0.0.1');
  assert.equal(configuration(env).poolMax,8);
  assert.equal(configuration({...env,DB_POOL_MAX:'1'}).poolMax,1);
  assert.equal(configuration({...env,DB_POOL_MAX:'100'}).poolMax,100);
  for (const value of ['0','101','8.5','8x','-1']) assert.throws(()=>configuration({...env,DB_POOL_MAX:value}),/DB_POOL_MAX/);
});
