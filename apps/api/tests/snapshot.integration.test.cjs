const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { Pool } = require('pg');
const { createApplication } = require('../dist/app');
const { Database, migrate, tokenHash, parseCsv } = require('@supply-chain/operations');

let app, second, db, admin, url, otherUrl, a, b, reader, testPort, testPassword;

async function actor(name, tenantId = randomUUID(), role = 'operator') {
  const id = randomUUID(), token = randomBytes(32).toString('base64url');
  await db.pool.query("INSERT INTO public.sc_tenants(id,name,timezone)VALUES($1,$2,'UTC')ON CONFLICT DO NOTHING", [tenantId, name]);
  await db.pool.query('INSERT INTO public.sc_api_keys(id,tenant_id,token_hash,role)VALUES($1,$2,$3,$4)', [id, tenantId, tokenHash(token), role]);
  return { tenantId, actorId: id, role, token };
}

async function call(path, who = a, body, base = url) {
  const response = await fetch(base + '/api/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + who.token,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() };
}

async function success(path, body, who = a, base = url) {
  const r = await call(path, who, body, base);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}

const source = () => ({ idempotencyKey: randomUUID(), sourceSystem: 'snapshot-test', externalId: randomUUID() });

async function stock(who = a, unit = 'each', quantityPrecision = 0) {
  const code = randomUUID();
  const f = await call('facilities', who, { code, name: 'Snapshot Warehouse ' + code.slice(0, 8), kind: 'warehouse', timezone: 'UTC', latitude: 0, longitude: 0, locationSource: 'estimated', sourceSystem: 'snapshot-test', externalId: code });
  assert.equal(f.status, 201);
  const s = await call('skus', who, { code, name: 'Snapshot SKU ' + code.slice(0, 8), unit, quantityPrecision, sourceSystem: 'snapshot-test', externalId: code });
  assert.equal(s.status, 201);
  return { facilityId: f.body.id, skuId: s.body.id, unit };
}

async function order(key, quantity = '5', who = a) {
  const input = { ...source(), facilityId: key.facilityId, customerReference: 'customer-' + randomUUID().slice(0, 8), lines: [{ skuId: key.skuId, quantity, unit: key.unit }] };
  const receipt = await success('fulfillment/orders', input, who);
  return { key, input, ...receipt };
}

before(async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Use pnpm test:integration');
  app = await createApplication({ connectionString: process.env.TEST_DATABASE_URL, host: '127.0.0.1', port: 3100 });
  db = app.get(Database);
  admin = new Pool({ connectionString: process.env.TEST_ADMIN_URL });
  await migrate(db.pool);
  await migrate(db.pool);

  a = await actor('Synthetic Snapshot Tenant A');
  b = await actor('Synthetic Snapshot Tenant B');
  reader = await actor('Synthetic Snapshot Reader', a.tenantId, 'reader');

  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
  second = await createApplication({ connectionString: process.env.TEST_DATABASE_URL, host: '127.0.0.1', port: 3100 });
  await second.listen(0, '127.0.0.1');
  otherUrl = await second.getUrl();

  // Setup snapshot_reader role in database
  await admin.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='snapshot_reader') THEN
        CREATE ROLE snapshot_reader NOLOGIN;
      END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO snapshot_reader;
    GRANT SELECT ON public.sc_planning_snapshots TO snapshot_reader;
    GRANT SELECT ON public.sc_snapshot_artifacts TO snapshot_reader;
  `);
});

after(async () => {
  await second?.close();
  await app?.close();
  await admin?.end();
});

test('operator can create planning snapshot with hashed manifest and all artifacts; reader is rejected with 403', async () => {
  // Reader is rejected with 403
  const reject = await call('integrations/snapshots', reader, { ...source(), schemaVersion: 1, notes: 'Unauthorized snapshot' });
  assert.equal(reject.status, 403);

  // Seed operational data for tenant A
  const item1 = await stock(a, 'each', 0);
  const item2 = await stock(a, 'kg', 2);
  await success('inventory/receive', { ...source(), facilityId: item1.facilityId, skuId: item1.skuId, unit: item1.unit, quantity: '10' }, a);
  await success('inventory/receive', { ...source(), facilityId: item2.facilityId, skuId: item2.skuId, unit: item2.unit, quantity: '25.50' }, a);
  const ord = await order(item1, '3', a);

  // Operator creates approved snapshot
  const request = { ...source(), schemaVersion: 1, notes: 'Approved baseline for Q1' };
  const manifest = await success('integrations/snapshots', request, a);

  // Validate manifest structure & lineage
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.manifestVersion, 1);
  assert.equal(manifest.source, 'operational');
  assert.equal(manifest.planningApproved, true);
  assert.equal(manifest.tenantId, a.tenantId);
  assert.equal(manifest.actorId, a.actorId);
  assert.equal(manifest.sourceSystem, request.sourceSystem);
  assert.equal(manifest.externalId, request.externalId);
  assert.equal(manifest.approval.approvedBy, a.actorId);
  assert.equal(manifest.approval.notes, 'Approved baseline for Q1');
  assert.equal(manifest.lineage.tenantId, a.tenantId);
  assert.equal(manifest.lineage.actorId, a.actorId);
  assert.equal(manifest.lineage.sourceSystem, request.sourceSystem);
  assert.equal(manifest.lineage.externalId, request.externalId);
  assert.match(manifest.manifestSha256, /^[a-f0-9]{64}$/);
  assert.match(manifest.contentSha256, /^[a-f0-9]{64}$/);

  // Required artifacts
  const artifactNames = manifest.artifacts.map(art => art.name).sort();
  assert.deepEqual(artifactNames, ['facilities.csv', 'orders.csv', 'skus.csv', 'stock.csv']);

  // Fetch individual artifacts via GET /integrations/snapshot/artifact
  for (const meta of manifest.artifacts) {
    const artRes = await call(`integrations/snapshot/artifact?id=${manifest.id}&name=${meta.name}`, a);
    assert.equal(artRes.status, 200);
    const art = artRes.body;
    assert.equal(art.name, meta.name);
    assert.equal(art.fileName, meta.fileName);
    assert.equal(art.contentSha256, meta.contentSha256);
    assert.equal(art.byteSize, meta.byteSize);
    assert.equal(createHash('sha256').update(art.content).digest('hex'), meta.contentSha256);
    assert.equal(Buffer.byteLength(art.content, 'utf8'), meta.byteSize);

    // Verify CSV contents contain expected headers and rows
    if (meta.name === 'facilities.csv') {
      const rows = parseCsv(art.content);
      assert.ok(rows.length >= 2, 'Should have header and facility rows');
      assert.deepEqual(rows[0], ['facility_id', 'code', 'name', 'kind', 'timezone', 'latitude', 'longitude', 'location_source', 'source_system', 'external_id']);
      assert.ok(art.content.includes(item1.facilityId));
    } else if (meta.name === 'skus.csv') {
      const rows = parseCsv(art.content);
      assert.ok(rows.length >= 2, 'Should have header and sku rows');
      assert.deepEqual(rows[0], ['sku_id', 'code', 'name', 'unit', 'quantity_precision', 'source_system', 'external_id']);
      assert.ok(art.content.includes(item1.skuId));
    } else if (meta.name === 'stock.csv') {
      const rows = parseCsv(art.content);
      assert.ok(rows.length >= 2, 'Should have header and stock rows');
      assert.deepEqual(rows[0], ['facility_id', 'sku_id', 'unit', 'quantity_precision', 'on_hand', 'reserved', 'available']);
      assert.ok(art.content.includes(item1.facilityId));
    } else if (meta.name === 'orders.csv') {
      const rows = parseCsv(art.content);
      assert.ok(rows.length >= 2, 'Should have header and order rows');
      assert.deepEqual(rows[0], ['order_id', 'facility_id', 'customer_reference', 'state', 'source_system', 'external_id', 'line_id', 'sku_id', 'sku_code', 'sku_name', 'unit', 'quantity_precision', 'requested', 'allocated', 'shipped', 'created_at']);
      assert.ok(art.content.includes(ord.orderId));
    }
  }

  // Also fetch and verify manifest.json artifact
  const manifestArtRes = await call(`integrations/snapshot/artifact?id=${manifest.id}&name=manifest.json`, a);
  assert.equal(manifestArtRes.status, 200);
  const manifestArt = manifestArtRes.body;
  assert.equal(manifestArt.name, 'manifest.json');
  assert.equal(createHash('sha256').update(manifestArt.content).digest('hex'), manifestArt.contentSha256);
  assert.equal(Buffer.byteLength(manifestArt.content, 'utf8'), manifestArt.byteSize);
  const parsedManifest = JSON.parse(manifestArt.content);
  assert.equal(parsedManifest.id, manifest.id);
  assert.equal(parsedManifest.manifestSha256, manifest.manifestSha256);
});

test('snapshot generation causes zero operational mutations or balance changes', async () => {
  const item = await stock(a);
  await success('inventory/receive', { ...source(), facilityId: item.facilityId, skuId: item.skuId, unit: item.unit, quantity: '12' }, a);

  // Capture operational counts before snapshot
  const countsBefore = await db.transaction(a, async tx => (await tx.query(`
    SELECT
      (SELECT count(*) FROM public.sc_inventory_movements)::int AS movements,
      (SELECT count(*) FROM public.sc_inventory_reservations)::int AS reservations,
      (SELECT count(*) FROM public.sc_orders)::int AS orders,
      (SELECT count(*) FROM public.sc_order_lines)::int AS order_lines,
      (SELECT count(*) FROM public.sc_shipments)::int AS shipments,
      (SELECT count(*) FROM public.sc_facilities)::int AS facilities,
      (SELECT count(*) FROM public.sc_skus)::int AS skus
  `)).rows[0]);

  // Balance before snapshot
  const balBefore = (await call(`inventory/balance?facilityId=${item.facilityId}&skuId=${item.skuId}`, a)).body.stock;

  // Generate snapshot
  const req = { ...source(), schemaVersion: 1, notes: 'Mutation guard check' };
  const snap = await success('integrations/snapshots', req, a);
  assert.ok(snap.id);

  // Operational counts after snapshot must match exactly
  const countsAfter = await db.transaction(a, async tx => (await tx.query(`
    SELECT
      (SELECT count(*) FROM public.sc_inventory_movements)::int AS movements,
      (SELECT count(*) FROM public.sc_inventory_reservations)::int AS reservations,
      (SELECT count(*) FROM public.sc_orders)::int AS orders,
      (SELECT count(*) FROM public.sc_order_lines)::int AS order_lines,
      (SELECT count(*) FROM public.sc_shipments)::int AS shipments,
      (SELECT count(*) FROM public.sc_facilities)::int AS facilities,
      (SELECT count(*) FROM public.sc_skus)::int AS skus
  `)).rows[0]);

  assert.deepEqual(countsAfter, countsBefore, 'Operational tables must not receive any rows or deletions during snapshot generation');

  const balAfter = (await call(`inventory/balance?facilityId=${item.facilityId}&skuId=${item.skuId}`, a)).body.stock;
  assert.deepEqual(balAfter, balBefore, 'Stock balances must not change during snapshot generation');

  // Inventory reconciliation remains consistent
  const recon = (await call(`inventory/reconciliation?facilityId=${item.facilityId}&skuId=${item.skuId}`, a)).body;
  assert.equal(recon.consistent, true);
});

test('repeat fetches and idempotent command replays are byte-for-byte stable; conflicting payloads are rejected with 409', async () => {
  const req = { ...source(), schemaVersion: 1, notes: 'Idempotency and stability check' };
  const first = await success('integrations/snapshots', req, a);

  // Repeat GET /snapshot yields identical manifest
  const fetched = (await call(`integrations/snapshot?id=${first.id}`, a)).body;
  assert.deepEqual(fetched, first);

  // Idempotent replay of identical command returns identical manifest
  const replay = await success('integrations/snapshots', req, a);
  assert.deepEqual(replay, first);

  // Conflicting payload with same idempotency key fails with 409
  const conflict = await call('integrations/snapshots', a, { ...req, notes: 'Conflicting notes' });
  assert.equal(conflict.status, 409);

  // Concurrent replay across two API instances
  const concurrent = await Promise.all([
    call('integrations/snapshots', a, req, url),
    call('integrations/snapshots', a, req, otherUrl)
  ]);
  assert.ok(concurrent.every(res => res.status === 201));
  assert.deepEqual(concurrent[0].body, first);
  assert.deepEqual(concurrent[1].body, first);
});

test('tenant isolation: tenant B cannot read tenant A snapshots or artifacts; reader in tenant A can read', async () => {
  const req = { ...source(), schemaVersion: 1, notes: 'Isolation check' };
  const snapA = await success('integrations/snapshots', req, a);

  // Tenant B cannot get Tenant A's snapshot
  const resB = await call(`integrations/snapshot?id=${snapA.id}`, b);
  assert.equal(resB.status, 404);

  // Tenant B cannot get Tenant A's artifact
  const artB = await call(`integrations/snapshot/artifact?id=${snapA.id}&name=facilities.csv`, b);
  assert.equal(artB.status, 404);

  // Tenant B list snapshots does not include Tenant A's snapshot
  const listB = (await call('integrations/snapshots', b)).body;
  assert.ok(!listB.items.some(item => item.id === snapA.id));

  // Reader in Tenant A can read Tenant A's snapshot and artifacts
  const readA = await call(`integrations/snapshot?id=${snapA.id}`, reader);
  assert.equal(readA.status, 200);
  assert.deepEqual(readA.body, snapA);

  const readArtA = await call(`integrations/snapshot/artifact?id=${snapA.id}&name=facilities.csv`, reader);
  assert.equal(readArtA.status, 200);
  assert.equal(readArtA.body.name, 'facilities.csv');

  // Reader in Tenant A can list snapshots
  const listA = (await call('integrations/snapshots', reader)).body;
  assert.ok(listA.items.some(item => item.id === snapA.id));
});

test('immutability guard: sc_planning_snapshots and sc_snapshot_artifacts reject UPDATE and DELETE with append-only error', async () => {
  const snap = await success('integrations/snapshots', { ...source(), schemaVersion: 1 }, a);

  // Direct UPDATE or DELETE on sc_planning_snapshots fails due to trigger history_guard
  await assert.rejects(
    db.transaction(a, tx => tx.query('UPDATE public.sc_planning_snapshots SET notes = $1 WHERE id = $2', ['tampered', snap.id])),
    /append-only/
  );

  await assert.rejects(
    db.transaction(a, tx => tx.query('DELETE FROM public.sc_planning_snapshots WHERE id = $1', [snap.id])),
    /append-only/
  );

  // Direct UPDATE or DELETE on sc_snapshot_artifacts fails due to trigger history_guard
  await assert.rejects(
    db.transaction(a, tx => tx.query("UPDATE public.sc_snapshot_artifacts SET content = 'tampered' WHERE snapshot_id = $1", [snap.id])),
    /append-only/
  );

  await assert.rejects(
    db.transaction(a, tx => tx.query('DELETE FROM public.sc_snapshot_artifacts WHERE snapshot_id = $1', [snap.id])),
    /append-only/
  );
});

test('late audit failure rolls back snapshot, artifacts, and integration command', async () => {
  const req = source();

  // Create audit failure trigger
  await admin.query(`
    CREATE FUNCTION public.snapshot_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.entity_type = 'planning_snapshot' THEN
        RAISE EXCEPTION 'Synthetic snapshot audit failure';
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER snapshot_test_failure BEFORE INSERT ON public.sc_audit_events
    FOR EACH ROW EXECUTE FUNCTION public.snapshot_test_failure();
  `);

  try {
    const failed = await call('integrations/snapshots', a, { ...req, schemaVersion: 1 });
    assert.equal(failed.status, 503);
  } finally {
    await admin.query('DROP TRIGGER snapshot_test_failure ON public.sc_audit_events; DROP FUNCTION public.snapshot_test_failure();');
  }

  // Verify rollback
  const check = await db.transaction(a, async tx => (await tx.query(`
    SELECT
      (SELECT count(*) FROM public.sc_planning_snapshots WHERE idempotency_key = $1)::int AS snapshots,
      (SELECT count(*) FROM public.sc_integration_commands WHERE idempotency_key = $1)::int AS receipts
  `, [req.idempotencyKey])).rows[0]);

  assert.deepEqual(check, { snapshots: 0, receipts: 0 });

  // Retry succeeding after audit trigger removal
  const retried = await success('integrations/snapshots', { ...req, schemaVersion: 1 }, a);
  assert.ok(retried.id);
});

test('database snapshot_reader role is constrained to SELECT with forced RLS', async () => {
  // Create test user with snapshot_reader role
  const testUser = 'user_' + randomUUID().replace(/-/g, '').slice(0, 16);
  const testPass = randomUUID();
  await admin.query(`
    CREATE ROLE ${testUser} LOGIN PASSWORD '${testPass}' IN ROLE snapshot_reader;
    GRANT CONNECT ON DATABASE platform_test TO ${testUser};
  `);

  // Connect as the snapshot_reader test user
  const client = new Pool({
    connectionString: process.env.TEST_ADMIN_URL.replace(/postgres:[^@]+@/, `${testUser}:${testPass}@`)
  });

  try {
    // Attempting to INSERT must fail with permission denied
    await assert.rejects(
      client.query("INSERT INTO public.sc_planning_snapshots(idempotency_key, actor_id, source_system, external_id, manifest_version, manifest_sha256, content_sha256, generated_at, approved_at, manifest) VALUES (gen_random_uuid(), gen_random_uuid(), 'test', 'test', 1, 'a', 'b', now(), now(), '{}')"),
      /permission denied/
    );

    // Attempting to UPDATE must fail with permission denied
    await assert.rejects(
      client.query("UPDATE public.sc_planning_snapshots SET notes = 'tampered'"),
      /permission denied/
    );

    // Attempting to DELETE must fail with permission denied
    await assert.rejects(
      client.query("DELETE FROM public.sc_planning_snapshots"),
      /permission denied/
    );

    // SELECT with tenant A context only returns tenant A's snapshots
    const clientA = await client.connect();
    try {
      await clientA.query('BEGIN');
      await clientA.query("SELECT set_config('app.tenant_id', $1, true)", [a.tenantId]);
      const resA = await clientA.query('SELECT count(*)::int AS n FROM public.sc_planning_snapshots');
      assert.ok(resA.rows[0].n > 0, 'Should be able to read tenant A snapshots');

      // Check RLS does not return tenant B snapshots when scoped to tenant A
      const resOther = await clientA.query('SELECT count(*)::int AS n FROM public.sc_planning_snapshots WHERE tenant_id = $1', [b.tenantId]);
      assert.equal(resOther.rows[0].n, 0, 'RLS must hide tenant B snapshots');
      await clientA.query('COMMIT');
    } finally {
      clientA.release();
    }
  } finally {
    await client.end();
    await admin.query(`
      REVOKE snapshot_reader FROM ${testUser};
      REVOKE ALL ON DATABASE platform_test FROM ${testUser};
      DROP ROLE IF EXISTS ${testUser};
    `);
  }
});
