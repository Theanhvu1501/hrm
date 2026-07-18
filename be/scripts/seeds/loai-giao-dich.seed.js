/**
 * Seed data for LoaiGiaoDich (Loại giao dịch) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'loai_giao_dich';

const data = [
  { ma: 'PHIEU_THU', ten: 'Phiếu thu', color: 'green', moTa: 'Phiếu thu tiền mặt' },
  { ma: 'PHIEU_CHI', ten: 'Phiếu chi', color: 'red', moTa: 'Phiếu chi tiền mặt' },
  { ma: 'BAO_CO', ten: 'Báo có ngân hàng', color: 'blue', moTa: 'Báo có từ ngân hàng (tiền vào)' },
  { ma: 'BAO_NO', ten: 'Báo nợ ngân hàng', color: 'orange', moTa: 'Báo nợ từ ngân hàng (tiền ra)' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
