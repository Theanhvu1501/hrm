/**
 * Rollback Script: Merge User Credentials back to Users
 * 
 * This script reverts the credential separation by copying password back to users table.
 * USE WITH CAUTION - This is for emergency rollback only.
 * 
 * Usage:
 *   env-cmd -e db node scripts/rollback-user-credentials.js [--dry-run] [--drop-credentials]
 * 
 * Options:
 *   --dry-run           Preview changes without modifying the database
 *   --drop-credentials  Drop the user_credentials collection after rollback
 */

const { MongoClient, ObjectId } = require('mongodb');

// Configuration from env-cmd
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

if (!MONGODB_URI || !MONGODB_DATABASE) {
  console.error('❌ Missing environment variables. Please run with env-cmd:');
  console.error('   env-cmd -e db node scripts/rollback-user-credentials.js');
  process.exit(1);
}

const USERS_COLLECTION = 'users';
const CREDENTIALS_COLLECTION = 'user_credentials';

async function rollback() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const dropCredentials = args.includes('--drop-credentials');

  console.log('\n🔄 User Credential Separation ROLLBACK');
  console.log('=======================================');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DATABASE);
    const usersCollection = db.collection(USERS_COLLECTION);
    const credentialsCollection = db.collection(CREDENTIALS_COLLECTION);

    // Step 1: Get all credentials
    const credentials = await credentialsCollection.find({}).toArray();
    console.log(`\n📊 Found ${credentials.length} credential records`);

    if (credentials.length === 0) {
      console.log('⚠️  No credentials found - nothing to rollback');
      return;
    }

    // Step 2: Match credentials to users
    let updatedCount = 0;
    let skippedCount = 0;

    for (const credential of credentials) {
      const userId = credential.userId;
      
      // Find the user
      let user;
      try {
        user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      } catch (e) {
        console.log(`  ⚠️  Invalid userId format: ${userId}`);
        skippedCount++;
        continue;
      }

      if (!user) {
        console.log(`  ⚠️  User not found for credential: ${userId}`);
        skippedCount++;
        continue;
      }

      if (user.password) {
        console.log(`  ⏭️  Skipping ${user.email} - already has password`);
        skippedCount++;
        continue;
      }

      console.log(`  📝 Will restore password for: ${user.email}`);

      if (!dryRun) {
        await usersCollection.updateOne(
          { _id: new ObjectId(userId) },
          {
            $set: {
              password: credential.password,
              refreshToken: credential.refreshToken,
              lastLoginAt: credential.lastLoginAt,
              updatedAt: new Date(),
            }
          }
        );
        updatedCount++;
      }
    }

    console.log(`\n📋 Rollback Summary:`);
    console.log(`   - Users updated: ${dryRun ? 'N/A (dry run)' : updatedCount}`);
    console.log(`   - Skipped: ${skippedCount}`);

    // Step 3: Optionally drop credentials collection
    if (dropCredentials && !dryRun) {
      await credentialsCollection.drop();
      console.log('\n🗑️  Dropped user_credentials collection');
    } else if (dropCredentials && dryRun) {
      console.log('\n⚠️  Would drop user_credentials collection (dry run)');
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes made');
    } else {
      console.log('\n✅ Rollback completed!');
    }

  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run rollback
rollback().catch(error => {
  console.error(error);
  process.exit(1);
});
