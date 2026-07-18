import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.MONGODB_DATABASE || 'digital-books';
const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);

    console.log(`Starting migration... ${DRY_RUN ? '(DRY RUN)' : ''}`);

    // 1. Create default tenant
    const tenantsCollection = db.collection('tenants');
    const existingTenant = await tenantsCollection.findOne({ slug: 'default' });

    let defaultTenantId: string;
    if (!existingTenant) {
      if (DRY_RUN) {
        defaultTenantId = 'dry-run-tenant-id';
        console.log('[DRY RUN] Would create default tenant');
      } else {
        const result = await tenantsCollection.insertOne({
          _id: new ObjectId(),
          name: 'Công ty mặc định',
          slug: 'default',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        defaultTenantId = result.insertedId.toString();
        console.log('Created default tenant:', defaultTenantId);
      }
    } else {
      defaultTenantId = existingTenant._id.toString();
      console.log('Default tenant already exists:', defaultTenantId);
    }

    // 2. Migrate users - create UserTenant records
    const usersCollection = db.collection('users');
    const userTenantsCollection = db.collection('user_tenants');

    // Get all users
    const allUsers = await usersCollection.find({}).toArray();

    for (const user of allUsers) {
      // Skip super admin - they don't need tenant membership
      if (user.isSuperAdmin) {
        console.log(`Skipping super admin: ${user.email}`);
        continue;
      }

      // Check if user already has membership in user_tenants collection
      const existingMembership = await userTenantsCollection.findOne({
        userId: user._id.toString(),
        tenantId: defaultTenantId,
      });

      if (!existingMembership) {
        // Determine role from old vaiTro field or tenants array
        let role = 'KIEM_SOAT';
        if (user.vaiTro) {
          role = user.vaiTro;
        } else if (user.tenants && user.tenants.length > 0) {
          role = user.tenants[0].role || 'KIEM_SOAT';
        }

        if (DRY_RUN) {
          console.log(`[DRY RUN] Would create UserTenant for ${user.email} with role ${role}`);
        } else {
          await userTenantsCollection.insertOne({
            _id: new ObjectId(),
            userId: user._id.toString(),
            tenantId: defaultTenantId,
            role: role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log(`Created UserTenant for ${user.email} with role ${role}`);
        }
      } else {
        console.log(`UserTenant already exists for ${user.email}`);
      }

      // Remove old tenants array and vaiTro from user document
      if (user.tenants || user.vaiTro || user.permissions) {
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would remove tenants/vaiTro/permissions from ${user.email}`);
        } else {
          await usersCollection.updateOne(
            { _id: user._id },
            {
              $unset: { tenants: '', vaiTro: '', permissions: '' },
            },
          );
          console.log(`Cleaned up old fields from ${user.email}`);
        }
      }
    }

    // 3. Add tenantId to all other collections
    const collections = [
      'tai_khoan',
      'doi_tuong',
      'san_pham',
      'hop_dong',
      'du_an',
      'bo_phan',
      'ngan_hang',
      'dong_tien',
      'chu_dau_tu',
      'khoan_muc',
      'nhom_khoan_muc',
      'nhom_quan_ly',
      'nhom_khuyen_mai',
      'loai_chung_tu',
      'loai_giao_dich',
      'chung_tu',
      'voucher_sequence',
      'cong_no',
      'quy_chuan',
      'phan_quyen',
    ];

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const docsWithoutTenant = await collection.countDocuments({ tenantId: { $exists: false } });

      if (docsWithoutTenant > 0) {
        if (DRY_RUN) {
          console.log(`[DRY RUN] Would update ${docsWithoutTenant} documents in ${collectionName}`);
        } else {
          const result = await collection.updateMany(
            { tenantId: { $exists: false } },
            { $set: { tenantId: defaultTenantId } },
          );
          console.log(`Updated ${result.modifiedCount} documents in ${collectionName}`);
        }
      }
    }

    // 4. Create indexes for user_tenants collection
    if (!DRY_RUN) {
      // Use same index name as entity definition to avoid conflicts
      await userTenantsCollection.createIndex(
        { userId: 1, tenantId: 1 },
        { unique: true, name: 'IDX_user_tenant_unique' },
      );
      console.log('Created indexes for user_tenants collection');
    }

    console.log(`Migration completed successfully! ${DRY_RUN ? '(DRY RUN)' : ''}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

migrate();
