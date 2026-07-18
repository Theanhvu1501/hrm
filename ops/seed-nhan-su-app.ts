import { MongoClient } from 'mongodb';

// Chạy: IDENTITY_MONGODB_URI=... IDENTITY_DB=masterceo_identity TENANT_ID=<id> npx ts-node hrm/ops/seed-nhan-su-app.ts
async function main() {
  const uri = process.env.IDENTITY_MONGODB_URI;
  const dbName = process.env.IDENTITY_DB || 'masterceo_identity';
  const tenantId = process.env.TENANT_ID; // optional: cấp entitlement cho 1 tenant
  if (!uri) throw new Error('IDENTITY_MONGODB_URI required');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const app = {
    appId: 'nhan-su',
    name: 'Nhân sự',
    feUrl: process.env.FE_NHAN_SU_URL || 'https://nhan-su.masterceo.com.vn',
    isActive: true,
  };
  await db.collection('apps').updateOne({ appId: app.appId }, { $set: app }, { upsert: true });

  if (tenantId) {
    await db.collection('tenant_apps').updateOne(
      { tenantId, appId: 'nhan-su' },
      { $set: { tenantId, appId: 'nhan-su', isActive: true } },
      { upsert: true },
    );
  }
  console.log('Seeded nhan-su app', tenantId ? `+ tenant_app for ${tenantId}` : '(no tenant)');
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
