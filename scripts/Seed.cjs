/**
 * @fileoverview Idempotent Database Seeder for Supply Chain Operations Platform.
 *
 * Seeds:
 * - Organization Tenant: "Cambodia Express Logistics"
 * - Operator API Credential
 * - 4 Regional Distribution Hubs & Depots (Phnom Penh, Siem Reap, Sihanoukville, Battambang)
 * - 4 Enterprise SKUs
 * - Initial Double-Entry Inventory Stock via Ledger
 * - Customer Fulfillment Orders
 */

const { Pool } = require('../apps/api/node_modules/pg');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const { resolve } = require('node:path');
const { readdirSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { configuration, projectRoot, tokenHash } = require('./../packages/operations/dist/index.js');


async function seed() {
  const config = configuration();
  const pool = new Pool({
    connectionString: config.connectionString,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();

  try {
    console.log('Connected to PostgreSQL:', config.connectionString.replace(/:[^:@]+@/, ':***@'));

    // 1. Tenant & API Key
    const tenantName = 'Cambodia Express Logistics';
    const timezone = 'Asia/Phnom_Penh';

    let tenantId;
    let actorId;
    let token;

    // Check if secret already exists
    const secretsDir = resolve(projectRoot, '.secrets');
    mkdirSync(secretsDir, { recursive: true });
    const existingSecretFiles = readdirSync(secretsDir).filter((f) => f.endsWith('.json'));

    if (existingSecretFiles.length > 0) {
      const existing = JSON.parse(readFileSync(resolve(secretsDir, existingSecretFiles[0]), 'utf8'));
      tenantId = existing.tenantId;
      actorId = existing.actorId;
      token = existing.token;
      console.log(`Using existing tenant ${tenantId} from .secrets/${existingSecretFiles[0]}`);
    } else {
      tenantId = randomUUID();
      actorId = randomUUID();
      token = randomBytes(32).toString('base64url');

      await client.query('BEGIN');
      await client.query(
        'INSERT INTO public.sc_tenants (id, name, timezone) VALUES ($1, $2, $3)',
        [tenantId, tenantName, timezone]
      );
      await client.query(
        "INSERT INTO public.sc_api_keys (id, tenant_id, token_hash, role) VALUES ($1, $2, $3, 'operator')",
        [actorId, tenantId, tokenHash(token)]
      );
      const secretPath = resolve(secretsDir, `${tenantId}.json`);
      writeFileSync(
        secretPath,
        JSON.stringify({ tenantId, actorId, role: 'operator', token }, null, 2),
        { mode: 0o600 }
      );
      await client.query('COMMIT');
      console.log(`Created new tenant ${tenantId} and saved secret to ${secretPath}`);
    }

    // 2. Facilities
    const facilities = [
      {
        code: 'DC-PNH-01',
        name: 'Phnom Penh Central Fulfillment Hub',
        kind: 'warehouse',
        timezone: 'Asia/Phnom_Penh',
        latitude: 11.5564,
        longitude: 104.9282,
        locationSource: 'surveyed',
      },
      {
        code: 'DC-REP-01',
        name: 'Siem Reap Regional Depot',
        kind: 'depot',
        timezone: 'Asia/Phnom_Penh',
        latitude: 13.3671,
        longitude: 103.8448,
        locationSource: 'surveyed',
      },
      {
        code: 'DC-KOS-01',
        name: 'Sihanoukville Coastal Cross-Dock',
        kind: 'warehouse',
        timezone: 'Asia/Phnom_Penh',
        latitude: 10.6253,
        longitude: 103.5234,
        locationSource: 'surveyed',
      },
      {
        code: 'DC-BAT-01',
        name: 'Battambang Distribution Center',
        kind: 'depot',
        timezone: 'Asia/Phnom_Penh',
        latitude: 13.0957,
        longitude: 103.2022,
        locationSource: 'surveyed',
      },
    ];

    const facilityMap = new Map();

    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    for (const f of facilities) {
      const res = await client.query(
        `INSERT INTO public.sc_facilities 
         (id, tenant_id, code, name, kind, timezone, latitude, longitude, location_source, source_system, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'seed-data', $3)
         ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [
          randomUUID(),
          tenantId,
          f.code,
          f.name,
          f.kind,
          f.timezone,
          f.latitude,
          f.longitude,
          f.locationSource,
        ]
      );
      facilityMap.set(f.code, res.rows[0].id);
    }
    await client.query('COMMIT');
    console.log(`Seeded ${facilities.length} operational facilities.`);

    // 3. Catalog SKUs
    const skus = [
      {
        code: 'SKU-MED-01',
        name: 'Emergency First Aid Kit (Type A)',
        unit: 'each',
        precision: 0,
        initialStock: 500,
      },
      {
        code: 'SKU-ELEC-01',
        name: 'Solar Inverter Battery 5kWh',
        unit: 'each',
        precision: 0,
        initialStock: 200,
      },
      {
        code: 'SKU-FOOD-01',
        name: 'Organic Jasmine Rice 25kg Bag',
        unit: 'each',
        precision: 0,
        initialStock: 1000,
      },
      {
        code: 'SKU-COLD-01',
        name: 'Temperature-Controlled Vaccine Vial',
        unit: 'each',
        precision: 0,
        initialStock: 300,
      },
    ];

    const skuMap = new Map();

    await client.query('BEGIN');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);

    for (const s of skus) {
      const res = await client.query(
        `INSERT INTO public.sc_skus 
         (id, tenant_id, code, name, unit, quantity_precision, source_system, external_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'seed-data', $3)
         ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [randomUUID(), tenantId, s.code, s.name, s.unit, s.precision]
      );
      skuMap.set(s.code, res.rows[0].id);
    }
    await client.query('COMMIT');
    console.log(`Seeded ${skus.length} catalog SKUs.`);

    // 4. Initial Double-Entry Inventory Stock in DC-PNH-01
    const pnhFacilityId = facilityMap.get('DC-PNH-01');

    for (const s of skus) {
      const skuId = skuMap.get(s.code);
      const idempotencyKey = randomUUID();
      const movementId = randomUUID();

      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      try {
        // Upsert balance
        await client.query(
          `INSERT INTO public.sc_inventory_balances 
           (tenant_id, facility_id, sku_id, unit, quantity_precision, on_hand, reserved)
           VALUES ($1, $2, $3, $4, $5, $6, 0)
           ON CONFLICT (tenant_id, facility_id, sku_id) 
           DO UPDATE SET on_hand = sc_inventory_balances.on_hand + EXCLUDED.on_hand`,
          [tenantId, pnhFacilityId, skuId, s.unit, s.precision, s.initialStock]
        );

        // Record command
        await client.query(
          `INSERT INTO public.sc_inventory_commands
           (tenant_id, idempotency_key, action, fingerprint, source_system, external_id, result)
           VALUES ($1, $2, 'receive', $3, 'seed-data', $4, $5)
           ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`,
          [
            tenantId,
            idempotencyKey,
            createHash('sha256').update(`receive:${s.code}:${s.initialStock}`).digest('hex'),
            `seed-receive-${s.code}`,
            JSON.stringify({ skuId, quantity: s.initialStock, facilityId: pnhFacilityId }),
          ]
        );

        // Record ledger movement
        await client.query(
          `INSERT INTO public.sc_inventory_movements
           (id, tenant_id, facility_id, sku_id, delta, action, source_system, external_id, actor_id, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, 'receive', 'seed-data', $6, $7, $8)
           ON CONFLICT DO NOTHING`,
          [
            movementId,
            tenantId,
            pnhFacilityId,
            skuId,
            s.initialStock,
            `seed-mv-${s.code}`,
            actorId,
            idempotencyKey,
          ]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn(`Initial stock for ${s.code} already exists or failed:`, err.message);
      }
    }
    console.log(`Initialized double-entry inventory ledger balances for Phnom Penh hub.`);

    // 5. Sample Customer Orders
    const orders = [
      {
        customerRef: 'CUST-REF-1001',
        externalId: 'SO-KH-1001',
        skuCode: 'SKU-MED-01',
        quantity: 10,
      },
      {
        customerRef: 'CUST-REF-1002',
        externalId: 'SO-KH-1002',
        skuCode: 'SKU-FOOD-01',
        quantity: 25,
      },
    ];

    for (const ord of orders) {
      const orderId = randomUUID();
      const lineId = randomUUID();
      const skuId = skuMap.get(ord.skuCode);
      const skuObj = skus.find((s) => s.code === ord.skuCode);

      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
      try {
        await client.query(
          `INSERT INTO public.sc_orders
           (id, tenant_id, facility_id, customer_reference, state, source_system, external_id, actor_id)
           VALUES ($1, $2, $3, $4, 'open', 'seed-data', $5, $6)
           ON CONFLICT (tenant_id, source_system, external_id) DO NOTHING`,
          [orderId, tenantId, pnhFacilityId, ord.customerRef, ord.externalId, actorId]
        );

        await client.query(
          `INSERT INTO public.sc_order_lines
           (id, tenant_id, order_id, sku_id, sku_code, sku_name, unit, quantity_precision, requested)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [
            lineId,
            tenantId,
            orderId,
            skuId,
            skuObj.code,
            skuObj.name,
            skuObj.unit,
            skuObj.precision,
            ord.quantity,
          ]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.warn(`Order ${ord.externalId} already exists or failed:`, err.message);
      }
    }
    console.log(`Seeded sample customer fulfillment orders.`);

    // Print summary
    console.log('\n======================================================');
    console.log('  LIVE DATABASE SEED COMPLETE');
    console.log('======================================================');
    console.log(`Tenant Name   : ${tenantName}`);
    console.log(`Tenant ID     : ${tenantId}`);
    console.log(`Operator Actor: ${actorId}`);
    console.log(`API Key Token : ${token.substring(0, 8)}... (saved in .secrets/)`);
    console.log(`Facilities    : 4 (${Array.from(facilityMap.keys()).join(', ')})`);
    console.log(`Catalog SKUs  : 4 (${Array.from(skuMap.keys()).join(', ')})`);
    console.log('======================================================\n');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
