const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { OidcValidator, AuditLog, AccessService, OperationalError } = require('../packages/operations');

function createTestJwt(payload, secret = 'secret-key-for-test-32bytes-min!') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

test('PILOT-01: OidcValidator parses and verifies valid token with HS256 signature', () => {
  const secret = 'pilot-secret-test-key-32-bytes-long!';
  const validator = new OidcValidator({
    sharedSecret: secret,
    issuer: 'https://auth.pilot-tenant.internal',
    audience: 'supply-chain-platform',
  });

  const now = Math.floor(Date.now() / 1000);
  const token = createTestJwt({
    sub: 'user-pilot-42',
    iss: 'https://auth.pilot-tenant.internal',
    aud: 'supply-chain-platform',
    exp: now + 3600,
    nbf: now - 60,
    tenant_id: 'tenant-pilot-alpha',
    tenant_name: 'Pilot Alpha Corp',
    timezone: 'Asia/Phnom_Penh',
    roles: ['operator'],
  }, secret);

  const actor = validator.validateToken(token);
  assert.equal(actor.actorId, 'user-pilot-42');
  assert.equal(actor.tenantId, 'tenant-pilot-alpha');
  assert.equal(actor.tenantName, 'Pilot Alpha Corp');
  assert.equal(actor.timezone, 'Asia/Phnom_Penh');
  assert.equal(actor.role, 'operator');
});

test('PILOT-01: OidcValidator maps reader and operator roles correctly', () => {
  const secret = 'shared-secret-12345';
  const validator = new OidcValidator({ sharedSecret: secret });
  const now = Math.floor(Date.now() / 1000);

  // Operator via 'admin'
  const adminToken = createTestJwt({
    sub: 'admin-1',
    exp: now + 3600,
    tenant_id: 't-1',
    roles: ['admin'],
  }, secret);
  assert.equal(validator.validateToken(adminToken).role, 'operator');

  // Reader default
  const readerToken = createTestJwt({
    sub: 'reader-1',
    exp: now + 3600,
    tenant_id: 't-1',
    roles: ['reader', 'viewer'],
  }, secret);
  assert.equal(validator.validateToken(readerToken).role, 'reader');
});

test('PILOT-01: OidcValidator rejects expired, future, untrusted issuer, or tampered tokens', () => {
  const secret = 'shared-secret-secure';
  const validator = new OidcValidator({
    sharedSecret: secret,
    issuer: 'https://auth.trusted.org',
    audience: 'app-client',
  });
  const now = Math.floor(Date.now() / 1000);

  // Expired token
  const expiredToken = createTestJwt({
    sub: 'user-1',
    exp: now - 10,
    tenant_id: 't-1',
    iss: 'https://auth.trusted.org',
    aud: 'app-client',
  }, secret);
  assert.throws(() => validator.validateToken(expiredToken), /JWT token has expired/);

  // Future token (nbf in future)
  const futureToken = createTestJwt({
    sub: 'user-1',
    exp: now + 3600,
    nbf: now + 300,
    tenant_id: 't-1',
    iss: 'https://auth.trusted.org',
    aud: 'app-client',
  }, secret);
  assert.throws(() => validator.validateToken(futureToken), /JWT token not active yet/);

  // Issuer mismatch
  const issuerMismatchToken = createTestJwt({
    sub: 'user-1',
    exp: now + 3600,
    tenant_id: 't-1',
    iss: 'https://rogue-auth.example.com',
    aud: 'app-client',
  }, secret);
  assert.throws(() => validator.validateToken(issuerMismatchToken), /Untrusted token issuer/);

  // Audience mismatch
  const audMismatchToken = createTestJwt({
    sub: 'user-1',
    exp: now + 3600,
    tenant_id: 't-1',
    iss: 'https://auth.trusted.org',
    aud: 'other-app',
  }, secret);
  assert.throws(() => validator.validateToken(audMismatchToken), /Token audience does not match/);

  // Missing tenant_id
  const missingTenantToken = createTestJwt({
    sub: 'user-1',
    exp: now + 3600,
    iss: 'https://auth.trusted.org',
    aud: 'app-client',
  }, secret);
  assert.throws(() => validator.validateToken(missingTenantToken), /Missing tenant_id claim/);

  // Tampered signature
  const validToken = createTestJwt({
    sub: 'user-1',
    exp: now + 3600,
    tenant_id: 't-1',
    iss: 'https://auth.trusted.org',
    aud: 'app-client',
  }, secret);
  const parts = validToken.split('.');
  const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignatureHere`;
  assert.throws(() => validator.validateToken(tamperedToken), /Invalid JWT signature/);
});

test('PILOT-01: AccessService enforces OIDC role authorization for write operations', async () => {
  const secret = 'shared-secret-access-service';
  const validator = new OidcValidator({ sharedSecret: secret });
  const mockRepo = { ready: async () => true, findActor: async () => undefined };
  const accessService = new AccessService(mockRepo, validator);

  const now = Math.floor(Date.now() / 1000);
  const readerToken = createTestJwt({
    sub: 'reader-user',
    exp: now + 3600,
    tenant_id: 'tenant-1',
    role: 'reader',
  }, secret);

  const operatorToken = createTestJwt({
    sub: 'operator-user',
    exp: now + 3600,
    tenant_id: 'tenant-1',
    role: 'operator',
  }, secret);

  // Reader can authorize read (write: false)
  const readActor = await accessService.authorize(readerToken, false);
  assert.equal(readActor.actorId, 'reader-user');
  assert.equal(readActor.role, 'reader');

  // Reader is rejected for write (write: true) with 403
  await assert.rejects(
    async () => accessService.authorize(readerToken, true),
    (err) => err instanceof OperationalError && err.status === 403 && /operator credential is required/.test(err.message)
  );

  // Operator can authorize write
  const writeActor = await accessService.authorize(operatorToken, true);
  assert.equal(writeActor.actorId, 'operator-user');
  assert.equal(writeActor.role, 'operator');
});

test('PILOT-01: AccessService falls back to API Key repo when token is not JWT format', async () => {
  const mockRepo = {
    ready: async () => true,
    findActor: async (token) => {
      if (token === 'valid_api_key_43chars_length_mocked_for_test') {
        return { actorId: 'api-actor-1', tenantId: 'tenant-api', role: 'operator', tenantName: 'API Org', timezone: 'UTC' };
      }
      return undefined;
    },
  };
  const accessService = new AccessService(mockRepo);

  const actor = await accessService.authorize('valid_api_key_43chars_length_mocked_for_test', true);
  assert.equal(actor.actorId, 'api-actor-1');
  assert.equal(actor.role, 'operator');

  // Unknown API key throws 401
  await assert.rejects(
    async () => accessService.authorize('unknown_api_key', false),
    (err) => err instanceof OperationalError && err.status === 401
  );
});

test('PILOT-01: AuditLog builds tamper-evident cryptographic hash chain', () => {
  const audit = new AuditLog();
  const actor1 = { actorId: 'act-1', tenantId: 't-1', role: 'operator', tenantName: 'Tenant 1', timezone: 'UTC' };
  const actor2 = { actorId: 'act-2', tenantId: 't-2', role: 'reader', tenantName: 'Tenant 2', timezone: 'UTC' };

  const e1 = audit.record(actor1, 'created', 'facility', 'fac-101', { name: 'Main Hub' });
  const e2 = audit.record(actor1, 'allocated', 'order', 'ord-500', { qty: 25 });
  const e3 = audit.record(actor2, 'inspected', 'sku', 'sku-999');

  // Initial sequence is intact and verifies
  assert.equal(audit.verifyChainIntegrity(), true);
  assert.equal(e1.previousHash, '0000000000000000000000000000000000000000000000000000000000000000');
  assert.equal(e2.previousHash, e1.hash);
  assert.equal(e3.previousHash, e2.hash);

  // Tenant filtering
  assert.equal(audit.getEntries('t-1').length, 2);
  assert.equal(audit.getEntries('t-2').length, 1);
  assert.equal(audit.getEntries().length, 3);
});

test('PILOT-01: AuditLog detects tamper in entry content or hash manipulation', () => {
  const audit = new AuditLog();
  const actor = { actorId: 'act-1', tenantId: 't-1', role: 'operator', tenantName: 'Tenant 1', timezone: 'UTC' };

  audit.record(actor, 'created', 'sku', 'sku-1');
  audit.record(actor, 'received', 'stock', 'stk-1', { quantity: 100 });
  audit.record(actor, 'dispatched', 'shipment', 'shp-1');

  assert.equal(audit.verifyChainIntegrity(), true);

  // Tamper with middle entry's action
  const entries = audit.getEntries();
  entries[1].action = 'tampered_action';
  assert.equal(audit.verifyChainIntegrity(), false);

  // Restore action, tamper with hash
  entries[1].action = 'received';
  entries[1].hash = 'deadbeef00000000000000000000000000000000000000000000000000000000';
  assert.equal(audit.verifyChainIntegrity(), false);
});
