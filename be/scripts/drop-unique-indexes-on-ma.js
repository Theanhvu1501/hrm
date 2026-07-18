/**
 * Migration Script: Replace global unique indexes on 'ma' with per-tenant partial unique indexes
 *
 * In a multi-tenant system, the unique index on 'ma' is global (not per-tenant),
 * which prevents different tenants from having the same 'ma' value.
 * This script:
 *   1. Drops old indexes on 'ma' (both single-field and compound without partial filter)
 *   2. Creates a new partial compound unique index on { ma: 1, tenantId: 1 }
 *      with partialFilterExpression: { isActive: true }
 *      This allows soft-deleted records (isActive: false) to not block new records with same ma.
 *
 * Usage:
 *   env-cmd -e db node scripts/drop-unique-indexes-on-ma.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without modifying the database
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

if (!MONGODB_URI || !MONGODB_DATABASE) {
  console.error('Missing environment variables. Please run with env-cmd:');
  console.error('   env-cmd -e db node scripts/drop-unique-indexes-on-ma.js');
  process.exit(1);
}

// Collections that had unique index on 'ma'
const MA_COLLECTIONS = [
  'bo_phan',
  'chu_dau_tu',
  'doi_tuong',
  'dong_tien',
  'du_an',
  'khoan_muc',
  'loai_chung_tu',
  'loai_giao_dich',
  'ngan_hang',
  'nhom_khoan_muc',
  'nhom_khuyen_mai',
  'nhom_quan_ly',
  'san_pham',
  'tai_khoan',
];

// hop_dong uses 'soHopDong' instead of 'ma'
const SO_HOP_DONG_COLLECTIONS = [
  { collection: 'hop_dong', field: 'soHopDong' },
];

async function migrateIndexes() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`Connected to MongoDB: ${MONGODB_DATABASE}\n`);

    const db = client.db(MONGODB_DATABASE);

    const stats = { dropped: 0, created: 0, skippedDrop: 0, skippedCreate: 0, errors: 0 };

    console.log('=== STEP 1: Drop old unique indexes ===\n');

    for (const colName of MA_COLLECTIONS) {
      await dropOldIndexes(db, colName, 'ma', isDryRun, stats);
    }
    for (const { collection, field } of SO_HOP_DONG_COLLECTIONS) {
      await dropOldIndexes(db, collection, field, isDryRun, stats);
    }

    console.log('\n=== STEP 2: Create partial compound unique indexes ===\n');

    for (const colName of MA_COLLECTIONS) {
      await createPartialIndex(db, colName, 'ma', isDryRun, stats);
    }
    for (const { collection, field } of SO_HOP_DONG_COLLECTIONS) {
      await createPartialIndex(db, collection, field, isDryRun, stats);
    }

    console.log('\n==================================================');
    console.log('SUMMARY');
    console.log('==================================================');
    console.log(`Old indexes dropped: ${stats.dropped}`);
    console.log(`Drop skipped (no old index): ${stats.skippedDrop}`);
    console.log(`Partial indexes created: ${stats.created}`);
    console.log(`Create skipped (already exists): ${stats.skippedCreate}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total collections: ${MA_COLLECTIONS.length + SO_HOP_DONG_COLLECTIONS.length}`);
    if (isDryRun) {
      console.log('\nThis was a DRY RUN. Run without --dry-run to apply changes.');
    }
    console.log('==================================================');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

async function dropOldIndexes(db, colName, field, isDryRun, stats) {
  try {
    const collection = db.collection(colName);
    const indexes = await collection.indexes();

    // Find ALL unique indexes that include the target field (except _id)
    const uniqueIndexes = indexes.filter(
      (idx) =>
        idx.unique &&
        idx.key &&
        idx.key[field] !== undefined &&
        idx.name !== '_id_'
    );

    if (uniqueIndexes.length === 0) {
      console.log(`  ${colName}: No unique index on '${field}' -- skipping`);
      stats.skippedDrop++;
      return;
    }

    for (const idx of uniqueIndexes) {
      // Skip if it's already the correct partial index
      if (idx.partialFilterExpression && idx.partialFilterExpression.isActive === true) {
        console.log(`  ${colName}: Index '${idx.name}' is already a partial index -- skipping`);
        stats.skippedDrop++;
        continue;
      }

      if (isDryRun) {
        console.log(`  ${colName}: Would drop index '${idx.name}' (keys: ${JSON.stringify(idx.key)})`);
        stats.dropped++;
        continue;
      }

      await collection.dropIndex(idx.name);
      console.log(`  ${colName}: Dropped index '${idx.name}' (keys: ${JSON.stringify(idx.key)})`);
      stats.dropped++;
    }
  } catch (error) {
    console.error(`  ${colName}: Drop error -- ${error.message}`);
    stats.errors++;
  }
}

async function createPartialIndex(db, colName, field, isDryRun, stats) {
  try {
    const collection = db.collection(colName);
    const indexes = await collection.indexes();

    // Check if partial compound index already exists
    const partialExists = indexes.find(
      (idx) =>
        idx.unique &&
        idx.key &&
        idx.key[field] !== undefined &&
        idx.key['tenantId'] !== undefined &&
        idx.partialFilterExpression &&
        idx.partialFilterExpression.isActive === true
    );

    if (partialExists) {
      console.log(`  ${colName}: Partial unique index already exists -- skipping`);
      stats.skippedCreate++;
      return;
    }

    const indexName = `${field}_tenantId_active_unique`;

    if (isDryRun) {
      console.log(`  ${colName}: Would create index '${indexName}' ({ ${field}: 1, tenantId: 1 } where isActive=true)`);
      stats.created++;
      return;
    }

    await collection.createIndex(
      { [field]: 1, tenantId: 1 },
      {
        unique: true,
        name: indexName,
        partialFilterExpression: { isActive: true },
      }
    );
    console.log(`  ${colName}: Created index '${indexName}' ({ ${field}: 1, tenantId: 1 } where isActive=true)`);
    stats.created++;
  } catch (error) {
    console.error(`  ${colName}: Create error -- ${error.message}`);
    stats.errors++;
  }
}

migrateIndexes();
