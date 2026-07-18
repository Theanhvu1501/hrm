/**
 * Migration Script: Separate User Credentials
 * 
 * This script migrates existing user data from the old structure (users with password)
 * to the new structure (users without password + user_credentials table).
 * 
 * Usage:
 *   env-cmd -e db node scripts/migrate-user-credentials.js [--dry-run]
 * 
 * Options:
 *   --dry-run    Preview changes without modifying the database
 */

const { MongoClient, ObjectId } = require('mongodb');

// Configuration from env-cmd
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DATABASE = process.env.MONGODB_DATABASE;

if (!MONGODB_URI || !MONGODB_DATABASE) {
  console.error('❌ Missing environment variables. Please run with env-cmd:');
  console.error('   env-cmd -e db node scripts/migrate-user-credentials.js');
  process.exit(1);
}

const USERS_COLLECTION = 'users';
const CREDENTIALS_COLLECTION = 'user_credentials';

async function migrate() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n🔄 User Credential Separation Migration');
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
    const credentialsCollection = db.collection(CREDENTIALS_COLLECTION);

    // Step 1: Find all users with password field
    const usersWithPassword = await usersCollection.find({
      password: { $exists: true }
    }).toArray();

    console.log(`\n📊 Found ${usersWithPassword.length} users with password field`);

    if (usersWithPassword.length === 0) {
      console.log('✅ No migration needed - all users already migrated');
      return;
    }

    // Step 2: Check existing credentials to avoid duplicates
    const existingCredentials = await credentialsCollection.find({}).toArray();
    const existingUserIds = new Set(existingCredentials.map(c => c.userId));
    
    console.log(`📊 Found ${existingCredentials.length} existing credentials`);

    // Step 3: Prepare migration data
    const credentialsToCreate = [];
    const userIdsToUpdate = [];

    for (const user of usersWithPassword) {
      const userId = user._id.toString();
      
      if (existingUserIds.has(userId)) {
        console.log(`  ⏭️  Skipping user ${user.email} - credential already exists`);
        userIdsToUpdate.push(user._id); // Still need to remove password from user
        continue;
      }

      credentialsToCreate.push({
        _id: new ObjectId(),
        userId: userId,
        password: user.password,
        refreshToken: user.refreshToken || null,
        lastLoginAt: user.lastLoginAt || null,
        isActive: user.isActive !== false,
        createdAt: user.createdAt || new Date(),
        updatedAt: new Date(),
      });

      userIdsToUpdate.push(user._id);
      console.log(`  📝 Will migrate: ${user.email}`);
    }

    console.log(`\n📋 Migration Summary:`);
    console.log(`   - Credentials to create: ${credentialsToCreate.length}`);
    console.log(`   - Users to update (remove password): ${userIdsToUpdate.length}`);

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes made');
      console.log('\nCredentials that would be created:');
      credentialsToCreate.forEach(c => {
        console.log(`  - userId: ${c.userId}, isActive: ${c.isActive}`);
      });
      return;
    }

    // Step 4: Create credentials
    if (credentialsToCreate.length > 0) {
      const insertResult = await credentialsCollection.insertMany(credentialsToCreate);
      console.log(`\n✅ Created ${insertResult.insertedCount} credential records`);
    }

    // Step 5: Remove password field from users
    if (userIdsToUpdate.length > 0) {
      const updateResult = await usersCollection.updateMany(
        { _id: { $in: userIdsToUpdate } },
        { 
          $unset: { password: '', refreshToken: '', lastLoginAt: '' },
          $set: { updatedAt: new Date() }
        }
      );
      console.log(`✅ Updated ${updateResult.modifiedCount} user records (removed password field)`);
    }

    // Step 6: Verify migration
    const remainingWithPassword = await usersCollection.countDocuments({
      password: { $exists: true }
    });
    
    const totalCredentials = await credentialsCollection.countDocuments({});
    const totalUsers = await usersCollection.countDocuments({});

    console.log('\n📊 Post-Migration Stats:');
    console.log(`   - Total users: ${totalUsers}`);
    console.log(`   - Total credentials: ${totalCredentials}`);
    console.log(`   - Users still with password: ${remainingWithPassword}`);

    if (remainingWithPassword === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Some users still have password field - please investigate');
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
migrate().catch(error => {
  console.error(error);
  process.exit(1);
});
