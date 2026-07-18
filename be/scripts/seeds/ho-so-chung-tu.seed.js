/**
 * Seed data for HoSoChungTu (Hồ sơ chứng từ) collection
 * 4 loại hồ sơ chứng từ mặc định dùng trong kiểm soát hạch toán
 */
const { transformBatch, logResult, logError } = require('./utils');

const collectionName = 'ho_so_chung_tu';

const data = [
  { ma: 'PHIEU_CHI', ten: 'Phiếu chi', isActive: true },
  { ma: 'BANG_LUONG', ten: 'Bảng lương', isActive: true },
  { ma: 'PHIEU_NHAP', ten: 'Phiếu nhập', isActive: true },
  { ma: 'BIEN_BAN_NGHIEM_THU', ten: 'Biên bản nghiệm thu', isActive: true },
];

async function seed(db, options = {}) {
  const { clearBefore = false, dryRun = false } = options;
  const startTime = Date.now();

  try {
    const collection = db.collection(collectionName);

    if (clearBefore && !dryRun) {
      await collection.deleteMany({});
      console.log(`🗑️  ${collectionName}: Cleared existing data`);
    }

    const documents = transformBatch(data);

    if (dryRun) {
      console.log(`🔍 ${collectionName}: Would insert ${documents.length} records (dry run)`);
      return { inserted: 0, dryRun: true };
    }

    const result = await collection.insertMany(documents);
    const duration = Date.now() - startTime;
    logResult(collectionName, result.insertedCount, duration);

    return { inserted: result.insertedCount, duration };
  } catch (error) {
    logError(collectionName, error);
    throw error;
  }
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
