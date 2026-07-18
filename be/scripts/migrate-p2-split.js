/**
 * Migration Script: P2 Split — app_user_roles + tenant_app_config
 *
 * Populates two new collections from existing data (within digital_book DB):
 *   - app_user_roles    ← from user_tenants  (functional role per user per tenant)
 *   - tenant_app_config ← from tenants       (accounting/app config per tenant)
 *
 * Idempotent: skips docs that already exist in the target collection.
 * Source docs are NEVER modified or deleted.
 *
 * Usage:
 *   env-cmd -e db -- node scripts/migrate-p2-split.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview what would be inserted without writing to DB
 */

const { MongoClient } = require('mongodb');

// Configuration from env-cmd
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

if (!MONGODB_URI || !MONGODB_DATABASE) {
  console.error('❌ Missing environment variables. Please run with env-cmd:');
  console.error('   env-cmd -e db -- node scripts/migrate-p2-split.js');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

async function migrate() {
  console.log('\n🔄 P2 Split Migration — app_user_roles + tenant_app_config');
  console.log('=============================================================');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DATABASE);

    // -----------------------------------------------------------------------
    // Part 1: app_user_roles  ←  user_tenants
    // -----------------------------------------------------------------------
    console.log('\n📋 Part 1: Migrating user_tenants → app_user_roles');

    const userTenants = await db.collection('user_tenants').find({}).toArray();
    console.log(`   Found ${userTenants.length} user_tenants docs`);

    let rolesInserted = 0;
    let rolesSkipped = 0;

    for (const ut of userTenants) {
      const existing = await db.collection('app_user_roles').findOne({
        userId: ut.userId,
        tenantId: ut.tenantId,
      });

      if (existing) {
        rolesSkipped++;
        continue;
      }

      const doc = {
        userId: ut.userId,
        tenantId: ut.tenantId,
        role: ut.role || 'KIEM_SOAT',
        isActive: ut.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (dryRun) {
        console.log(`   📝 Would insert app_user_roles: userId=${doc.userId} tenantId=${doc.tenantId} role=${doc.role}`);
      } else {
        await db.collection('app_user_roles').insertOne(doc);
      }

      rolesInserted++;
    }

    // -----------------------------------------------------------------------
    // Part 2: tenant_app_config  ←  tenants
    // -----------------------------------------------------------------------
    console.log('\n📋 Part 2: Migrating tenants → tenant_app_config');

    const tenants = await db.collection('tenants').find({}).toArray();
    console.log(`   Found ${tenants.length} tenants docs`);

    let configsInserted = 0;
    let configsSkipped = 0;

    for (const t of tenants) {
      const tenantId = t._id.toString();

      const existing = await db.collection('tenant_app_config').findOne({ tenantId });

      if (existing) {
        configsSkipped++;
        continue;
      }

      const doc = {
        tenantId,
        modules: t.modules || ['KE_TOAN'],
        nganh: t.nganh ?? null,
        glossary: t.glossary || {},
        dashboardBlocks: t.dashboardBlocks ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (dryRun) {
        console.log(`   📝 Would insert tenant_app_config: tenantId=${tenantId} modules=${JSON.stringify(doc.modules)}`);
      } else {
        await db.collection('tenant_app_config').insertOne(doc);
      }

      configsInserted++;
    }

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('\n📊 Migration Summary:');
    console.log(`   app_user_roles    — inserted: ${rolesInserted},   skipped: ${rolesSkipped}`);
    console.log(`   tenant_app_config — inserted: ${configsInserted}, skipped: ${configsSkipped}`);
    console.log(JSON.stringify({ rolesInserted, rolesSkipped, configsInserted, configsSkipped }, null, 2));

    if (dryRun) {
      console.log('\n⚠️  DRY RUN complete — no data was written');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
