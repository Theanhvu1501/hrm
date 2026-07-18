/**
 * Seed data for NganHang (Tài khoản ngân hàng/Quỹ tiền mặt) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'ngan_hang';

const data = [
  { ma: 'QTM01', ten: 'Quỹ tiền mặt VNĐ', loai: 'TIEN_MAT', soDu: 250000000 },
  { ma: 'QTM02', ten: 'Quỹ tiền mặt tạm ứng', loai: 'TIEN_MAT', soDu: 50000000 },
  { ma: 'NH001', ten: 'Tài khoản thanh toán VCB', loai: 'NGAN_HANG', soDu: 1500000000, nganHang: 'Vietcombank', soTaiKhoan: '0071001234567' },
  { ma: 'NH002', ten: 'Tài khoản thanh toán TCB', loai: 'NGAN_HANG', soDu: 800000000, nganHang: 'Techcombank', soTaiKhoan: '19035678901234' },
  { ma: 'NH003', ten: 'Tài khoản thanh toán BIDV', loai: 'NGAN_HANG', soDu: 650000000, nganHang: 'BIDV', soTaiKhoan: '31410001234567' },
  { ma: 'NH004', ten: 'Tài khoản tiền gửi VCB', loai: 'NGAN_HANG', soDu: 2000000000, nganHang: 'Vietcombank', soTaiKhoan: '0071009876543' },
  { ma: 'NH005', ten: 'Tài khoản MB Bank', loai: 'NGAN_HANG', soDu: 320000000, nganHang: 'MB Bank', soTaiKhoan: '0801234567890' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
