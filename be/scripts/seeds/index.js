#!/usr/bin/env node
/**
 * Master seed script for MongoDB data migration
 * 
 * Usage:
 *   node scripts/seeds/index.js [options]
 * 
 * Options:
 *   --clear     Clear existing data before seeding
 *   --dry-run   Validate data without inserting
 *   --verbose   Show detailed logs
 *   --only=X    Run only specific seed (e.g., --only=bo-phan)
 */

const { connect, disconnect } = require('./config');

// Import all seed modules in dependency order
const seeds = [
  // Master data (danh mục)
  { name: 'bo-phan', module: require('./bo-phan.seed') },
  { name: 'doi-tuong', module: require('./doi-tuong.seed') },
  { name: 'dong-tien', module: require('./dong-tien.seed') },
  { name: 'du-an', module: require('./du-an.seed') },
  { name: 'khoan-muc', module: require('./khoan-muc.seed') },
  { name: 'ngan-hang', module: require('./ngan-hang.seed') },
  { name: 'san-pham', module: require('./san-pham.seed') },
  { name: 'tai-khoan', module: require('./tai-khoan.seed') },
  { name: 'phan-quyen', module: require('./phan-quyen.seed') },
  { name: 'nguoi-dung', module: require('./nguoi-dung.seed') },
  { name: 'loai-giao-dich', module: require('./loai-giao-dich.seed') },
  { name: 'quy-chuan', module: require('./quy-chuan.seed') },
  { name: 'loai-chung-tu', module: require('./loai-chung-tu.seed') },
  { name: 'ho-so-chung-tu', module: require('./ho-so-chung-tu.seed') },
  // Transaction data (giao dịch)
  { name: 'chung-tu', module: require('./chung-tu.seed') },
  { name: 'cong-no', module: require('./cong-no.seed') },
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    clearBefore: args.includes('--clear'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    only: args.find(a => a.startsWith('--only='))?.split('=')[1],
  };
}

async function runSeeds(options) {
  const { clearBefore, dryRun, verbose, only } = options;
  const startTime = Date.now();
  const results = [];

  console.log('\n🌱 Starting MongoDB seed migration...\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be inserted\n');
  }
  
  if (clearBefore) {
    console.log('⚠️  CLEAR MODE - Existing data will be deleted\n');
  }

  const db = await connect();

  // Filter seeds if --only is specified
  const seedsToRun = only 
    ? seeds.filter(s => s.name === only)
    : seeds;

  if (only && seedsToRun.length === 0) {
    console.error(`❌ Unknown seed: ${only}`);
    console.log(`Available seeds: ${seeds.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  for (const { name, module: seedModule } of seedsToRun) {
    try {
      if (verbose) {
        console.log(`\n📝 Processing ${name}...`);
      }
      
      const result = await seedModule.seed(db, { clearBefore, dryRun });
      results.push({ name, ...result, success: true });
    } catch (error) {
      results.push({ name, success: false, error: error.message });
      console.error(`❌ Failed to seed ${name}: ${error.message}`);
    }
  }

  await disconnect();

  // Print summary
  const duration = Date.now() - startTime;
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalInserted = successful.reduce((sum, r) => sum + (r.inserted || 0), 0);

  console.log('\n' + '='.repeat(50));
  console.log('📊 SEED MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`📦 Total records inserted: ${totalInserted}`);
  console.log(`⏱️  Duration: ${duration}ms`);
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed seeds:`);
    failed.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
  }
  
  console.log('='.repeat(50) + '\n');

  return failed.length === 0;
}

// Main execution
const options = parseArgs();
runSeeds(options)
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
