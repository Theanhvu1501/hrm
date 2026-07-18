/**
 * Script: Unset password and refreshToken fields from users collection
 * 
 * This script removes the password and refreshToken fields from all users
 * after migration to the new UserCredential structure.
 * 
 * Usage:
 *   yarn unset:password-fields
 *   yarn unset:password-fields:dry-run
 */

const { MongoClient } = require('mongodb');

// Configuration from env-cmd
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

if (!MONGODB_URI || !MONGODB_DATABASE) {
  console.error('❌ Missing environment variables. Please run with env-cmd:');
  console.error('   env-cmd -e db -- node scripts/unset-user-password-fields.js');
  process.exit(1);
}

const USERS_COLLECTION = 'users';

async function unsetFields() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n🔄 Unset Password & RefreshToken Fields');
  console.log('========================================');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(MONGODB_DATABASE);
    const usersCollection = db.collection(USERS_COLLECTION);

    // Count users with password or refreshToken fields
    const usersWithPassword = await usersCollection.countDocuments({
      password: { $exists: true }
    });
    
    const usersWithRefreshToken = await usersCollection.countDocuments({
      refreshToken: { $exists: true }
    });

    console.log(`\n📊 Found:`);
    console.log(`   - ${usersWithPassword} users with password field`);
    console.log(`   - ${usersWithRefreshToken} users with refreshToken field`);

    if (usersWithPassword === 0 && usersWithRefreshToken === 0) {
      console.log('\n✅ No fields to unset - already clean');
      return;
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes made');
      console.log('Run without --dry-run to apply changes');
      return;
    }

    // Unset password and refreshToken fields
    const result = await usersCollection.updateMany(
      {
        $or: [
          { password: { $exists: true } },
          { refreshToken: { $exists: true } }
        ]
      },
      {
        $unset: { password: '', refreshToken: '' },
        $set: { updatedAt: new Date() }
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} user records`);

    // Verify
    const remainingPassword = await usersCollection.countDocuments({
      password: { $exists: true }
    });
    const remainingRefreshToken = await usersCollection.countDocuments({
      refreshToken: { $exists: true }
    });

    console.log('\n📊 Post-Update Stats:');
    console.log(`   - Users with password: ${remainingPassword}`);
    console.log(`   - Users with refreshToken: ${remainingRefreshToken}`);

    if (remainingPassword === 0 && remainingRefreshToken === 0) {
      console.log('\n✅ All fields removed successfully!');
    } else {
      console.log('\n⚠️  Some fields still exist - please investigate');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run
unsetFields().catch(error => {
  console.error(error);
  process.exit(1);
});
