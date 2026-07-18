/**
 * Seed data for PhanQuyen (Phan quyen) collection
 * Uses upsert logic: update if vaiTro exists, create if not
 */
const { generateObjectId, now } = require('./utils');

const collectionName = 'phan_quyen';

const data = [
  {
    vaiTro: 'ADMIN',
    ten: 'Quan tri vien',
    moTa: 'Toan quyen quan ly he thong',
    permissions: ['*'],
    isActive: true,
  },
  {
    vaiTro: 'GIAM_DOC',
    ten: 'Giam doc',
    moTa: 'Phe duyet, xem bao cao tong quan',
    permissions: ['*'],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_TRUONG',
    ten: 'Ke toan truong',
    moTa: 'Quan ly ke toan, phe duyet chung tu',
    permissions: [
      'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
      'quan_ly_tai_khoan', 'quan_ly_danh_muc',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy', 'duyet_phieu',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_TONG_HOP',
    ten: 'Ke toan tong hop',
    moTa: 'Lap bao cao, tong hop so lieu',
    permissions: [
      'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
      'quan_ly_tai_khoan', 'quan_ly_danh_muc',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_QUY',
    ten: 'Ke toan quy',
    moTa: 'Quan ly thu chi, so quy',
    permissions: [
      'xem_so_quy', 'tao_phieu_thu', 'tao_phieu_chi',
      'xem_phieu_thu', 'xem_phieu_chi', 'sua_phieu',
      'xem_danh_muc',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KE_TOAN_CONG_NO',
    ten: 'Ke toan cong no',
    moTa: 'Quan ly cong no phai thu/tra',
    permissions: [
      'xem_cong_no', 'quan_ly_cong_no',
      'xem_phai_thu', 'xem_phai_tra',
      'xem_danh_muc', 'xem_doi_tuong',
    ],
    isActive: true,
  },
  {
    vaiTro: 'MANAGER',
    ten: 'Quan ly',
    moTa: 'Phe duyet chung tu, xem bao cao',
    permissions: [
      'duyet_phieu', 'xem_bao_cao', 'xem_tong_quan',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy', 'xem_so_cai',
    ],
    isActive: true,
  },
  {
    vaiTro: 'KIEM_SOAT',
    ten: 'Kiem soat',
    moTa: 'Kiem tra, doi chieu so lieu',
    permissions: [
      'xem_so_cai', 'xem_nhat_ky_chung', 'xem_bao_cao',
      'xem_phieu_thu', 'xem_phieu_chi',
      'xem_cong_no', 'xem_so_quy', 'xem_danh_muc',
    ],
    isActive: true,
  },
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

    if (dryRun) {
      console.log(`🔍 ${collectionName}: Would upsert ${data.length} records (dry run)`);
      return { inserted: 0, dryRun: true };
    }

    let upsertedCount = 0;
    let modifiedCount = 0;

    for (const item of data) {
      const result = await collection.updateOne(
        { vaiTro: item.vaiTro },
        {
          $set: {
            ten: item.ten,
            moTa: item.moTa,
            permissions: item.permissions,
            isActive: item.isActive,
            updatedAt: now(),
          },
          $setOnInsert: {
            _id: generateObjectId(),
            createdAt: now(),
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) upsertedCount++;
      if (result.modifiedCount > 0) modifiedCount++;
    }

    const duration = Date.now() - startTime;
    console.log(
      `📦 ${collectionName}: ${upsertedCount} inserted, ${modifiedCount} updated (${duration}ms)`,
    );

    return { inserted: upsertedCount, updated: modifiedCount, duration };
  } catch (error) {
    console.error(`❌ ${collectionName}: ${error.message}`);
    throw error;
  }
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
