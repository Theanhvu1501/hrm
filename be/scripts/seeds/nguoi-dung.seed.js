/**
 * Seed data for Users (Người dùng) collection
 * Also creates corresponding UserCredential records
 */
const { seedCollection, transformToDocument, now, generateObjectId } = require('./utils');
const bcrypt = require('bcrypt');

const collectionName = 'users';
const credentialCollectionName = 'user_credentials';

const rawData = [
  { hoTen: 'Nguyễn Văn Admin', email: 'admin@company.com', vaiTro: 'ADMIN', trangThai: 'HOAT_DONG' },
  { hoTen: 'Trần Thị Quỹ', email: 'ketoanquy@company.com', vaiTro: 'KE_TOAN_QUY', trangThai: 'HOAT_DONG' },
  { hoTen: 'Lê Văn Công Nợ', email: 'ketoancongno@company.com', vaiTro: 'KE_TOAN_CONG_NO', trangThai: 'HOAT_DONG' },
  { hoTen: 'Phạm Thị Tổng Hợp', email: 'ketoantonghop@company.com', vaiTro: 'KE_TOAN_TONG_HOP', trangThai: 'HOAT_DONG' },
  { hoTen: 'Hoàng Văn Quản Lý', email: 'manager@company.com', vaiTro: 'MANAGER', trangThai: 'HOAT_DONG' },
  { hoTen: 'Nguyễn Văn Giám Đốc', email: 'giamdoc@company.com', vaiTro: 'GIAM_DOC', trangThai: 'HOAT_DONG' },
  { hoTen: 'Trần Thị Kế Toán Trưởng', email: 'ketoantruong@company.com', vaiTro: 'KE_TOAN_TRUONG', trangThai: 'HOAT_DONG' },
  { hoTen: 'Vũ Thị Kiểm Soát', email: 'kiemsoat@company.com', vaiTro: 'KIEM_SOAT', trangThai: 'HOAT_DONG' },
];

// Default password for all seed users
const DEFAULT_PASSWORD = 'Password123!';

async function seed(db, options = {}) {
  const { clearBefore = false, dryRun = false } = options;
  const startTime = Date.now();

  try {
    const collection = db.collection(collectionName);
    const credentialCollection = db.collection(credentialCollectionName);

    if (clearBefore && !dryRun) {
      await collection.deleteMany({});
      await credentialCollection.deleteMany({});
      console.log(`🗑️  ${collectionName}: Cleared existing data`);
      console.log(`🗑️  ${credentialCollectionName}: Cleared existing data`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Transform user data WITHOUT password field
    const userDocuments = rawData.map(item => ({
      _id: generateObjectId(),
      hoTen: item.hoTen,
      email: item.email,
      vaiTro: item.vaiTro,
      trangThai: item.trangThai,
      permissions: [],
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    }));


    // Create corresponding UserCredential documents
    const credentialDocuments = userDocuments.map(user => ({
      _id: generateObjectId(),
      userId: user._id.toString(),
      password: hashedPassword,
      refreshToken: null,
      lastLoginAt: null,
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
    }));

    if (dryRun) {
      console.log(`🔍 ${collectionName}: Would insert ${userDocuments.length} records (dry run)`);
      console.log(`🔍 ${credentialCollectionName}: Would insert ${credentialDocuments.length} records (dry run)`);
      return { inserted: 0, dryRun: true };
    }

    // Insert users
    const userResult = await collection.insertMany(userDocuments);
    
    // Insert credentials
    const credentialResult = await credentialCollection.insertMany(credentialDocuments);
    
    const duration = Date.now() - startTime;
    console.log(`📦 ${collectionName}: Inserted ${userResult.insertedCount} records (${duration}ms)`);
    console.log(`📦 ${credentialCollectionName}: Inserted ${credentialResult.insertedCount} records`);
    console.log(`   Default password for all users: ${DEFAULT_PASSWORD}`);

    return { 
      inserted: userResult.insertedCount, 
      credentialsInserted: credentialResult.insertedCount,
      duration 
    };
  } catch (error) {
    console.error(`❌ ${collectionName}: ${error.message}`);
    throw error;
  }
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
  await db.collection(credentialCollectionName).deleteMany({});
}

module.exports = { collectionName, data: rawData, seed, clear };
