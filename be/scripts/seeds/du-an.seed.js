/**
 * Seed data for DuAn (Dự án) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'du_an';

const data = [
  { ma: 'DA001', ten: 'Xây dựng nhà máy ABC', ngayBatDau: new Date('2024-01-15'), ngayKetThuc: new Date('2024-12-31'), chuDuAn: 'Công ty TNHH ABC', trangThai: 'DANG_THUC_HIEN' },
  { ma: 'DA002', ten: 'Cải tạo văn phòng XYZ', ngayBatDau: new Date('2024-03-01'), ngayKetThuc: new Date('2024-06-30'), chuDuAn: 'Công ty CP XYZ', trangThai: 'HOAN_THANH' },
  { ma: 'DA003', ten: 'Xây dựng cầu đường nội bộ', ngayBatDau: new Date('2024-05-01'), ngayKetThuc: new Date('2025-05-01'), chuDuAn: 'Ban Quản lý Khu CN', trangThai: 'DANG_THUC_HIEN' },
  { ma: 'DA004', ten: 'Lắp đặt hệ thống điện mặt trời', ngayBatDau: new Date('2024-02-01'), ngayKetThuc: new Date('2024-04-30'), chuDuAn: 'Nhà máy Sản xuất DEF', trangThai: 'HOAN_THANH' },
  { ma: 'DA005', ten: 'Xây dựng kho bãi logistics', ngayBatDau: new Date('2024-06-01'), ngayKetThuc: new Date('2025-02-28'), chuDuAn: 'Công ty Logistics GHI', trangThai: 'TAM_DUNG' },
  { ma: 'DA006', ten: 'Nâng cấp hệ thống PCCC', ngayBatDau: new Date('2024-07-15'), ngayKetThuc: new Date('2024-10-15'), chuDuAn: 'Tòa nhà Văn phòng Tower', trangThai: 'DANG_THUC_HIEN' },
  { ma: 'DA007', ten: 'Xây dựng nhà xưởng sản xuất', ngayBatDau: new Date('2024-08-01'), ngayKetThuc: new Date('2025-08-01'), chuDuAn: 'Công ty TNHH JKL', trangThai: 'DANG_THUC_HIEN' },
  { ma: 'DA008', ten: 'Lắp đặt hệ thống điều hòa trung tâm', ngayBatDau: new Date('2024-04-01'), ngayKetThuc: new Date('2024-05-31'), chuDuAn: 'Trung tâm Thương mại MNO', trangThai: 'HOAN_THANH' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
