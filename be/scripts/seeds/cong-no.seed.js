/**
 * Seed data for CongNo (Công nợ) collection
 */
const { transformBatch, logResult, logError } = require('./utils');

const collectionName = 'cong_no';

const data = [
  // Công nợ phải thu
  { loai: 'PHAI_THU', doiTuongId: 'KH001', doiTuongTen: 'Công ty TNHH ABC', soTienGoc: 150000000, daThu: 50000000, conLai: 100000000, ngayPhatSinh: new Date('2024-10-15'), hanThanhToan: new Date('2024-11-15'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_THU', doiTuongId: 'KH002', doiTuongTen: 'Công ty CP XYZ', soTienGoc: 80000000, daThu: 0, conLai: 80000000, ngayPhatSinh: new Date('2024-09-20'), hanThanhToan: new Date('2024-10-20'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_THU', doiTuongId: 'KH003', doiTuongTen: 'Công ty TNHH DEF', soTienGoc: 200000000, daThu: 200000000, conLai: 0, ngayPhatSinh: new Date('2024-08-10'), hanThanhToan: new Date('2024-09-10'), trangThai: 'DA_THU_DU' },
  { loai: 'PHAI_THU', doiTuongId: 'KH004', doiTuongTen: 'Công ty CP GHI', soTienGoc: 120000000, daThu: 30000000, conLai: 90000000, ngayPhatSinh: new Date('2024-11-01'), hanThanhToan: new Date('2024-12-01'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_THU', doiTuongId: 'KH005', doiTuongTen: 'Công ty TNHH JKL', soTienGoc: 300000000, daThu: 0, conLai: 300000000, ngayPhatSinh: new Date('2024-07-15'), hanThanhToan: new Date('2024-08-15'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_THU', doiTuongId: 'KH006', doiTuongTen: 'Công ty CP MNO', soTienGoc: 50000000, daThu: 50000000, conLai: 0, ngayPhatSinh: new Date('2024-10-25'), hanThanhToan: new Date('2024-11-25'), trangThai: 'DA_THU_DU' },
  { loai: 'PHAI_THU', doiTuongId: 'KH007', doiTuongTen: 'Công ty TNHH PQR', soTienGoc: 180000000, daThu: 100000000, conLai: 80000000, ngayPhatSinh: new Date('2024-11-10'), hanThanhToan: new Date('2025-01-10'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_THU', doiTuongId: 'KH008', doiTuongTen: 'Công ty CP STU', soTienGoc: 95000000, daThu: 0, conLai: 95000000, ngayPhatSinh: new Date('2024-10-05'), hanThanhToan: new Date('2024-11-05'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_THU', doiTuongId: 'KH009', doiTuongTen: 'Công ty TNHH VWX', soTienGoc: 250000000, daThu: 150000000, conLai: 100000000, ngayPhatSinh: new Date('2024-09-01'), hanThanhToan: new Date('2024-10-01'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_THU', doiTuongId: 'KH010', doiTuongTen: 'Công ty CP YZA', soTienGoc: 75000000, daThu: 0, conLai: 75000000, ngayPhatSinh: new Date('2024-11-20'), hanThanhToan: new Date('2024-12-20'), trangThai: 'CHUA_THU' },
  // Công nợ phải trả
  { loai: 'PHAI_TRA', doiTuongId: 'NCC001', doiTuongTen: 'NCC Vật liệu Hoàng Long', soTienGoc: 250000000, daThu: 100000000, conLai: 150000000, ngayPhatSinh: new Date('2024-09-10'), hanThanhToan: new Date('2024-10-10'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC002', doiTuongTen: 'NCC Thiết bị Minh Phát', soTienGoc: 180000000, daThu: 0, conLai: 180000000, ngayPhatSinh: new Date('2024-08-15'), hanThanhToan: new Date('2024-09-15'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC003', doiTuongTen: 'NCC Xi măng Bình Dương', soTienGoc: 120000000, daThu: 120000000, conLai: 0, ngayPhatSinh: new Date('2024-10-01'), hanThanhToan: new Date('2024-11-01'), trangThai: 'DA_THU_DU' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC004', doiTuongTen: 'NCC Sắt thép Đông Á', soTienGoc: 450000000, daThu: 200000000, conLai: 250000000, ngayPhatSinh: new Date('2024-10-20'), hanThanhToan: new Date('2024-11-20'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC005', doiTuongTen: 'NCC Điện nước Tân Phú', soTienGoc: 85000000, daThu: 0, conLai: 85000000, ngayPhatSinh: new Date('2024-07-25'), hanThanhToan: new Date('2024-08-25'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC006', doiTuongTen: 'NCC Nhôm kính Hải Phòng', soTienGoc: 320000000, daThu: 0, conLai: 320000000, ngayPhatSinh: new Date('2024-11-05'), hanThanhToan: new Date('2024-12-05'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC007', doiTuongTen: 'NCC Gạch men Đồng Nai', soTienGoc: 95000000, daThu: 95000000, conLai: 0, ngayPhatSinh: new Date('2024-09-15'), hanThanhToan: new Date('2024-10-15'), trangThai: 'DA_THU_DU' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC008', doiTuongTen: 'NCC Sơn nước Việt Mỹ', soTienGoc: 65000000, daThu: 30000000, conLai: 35000000, ngayPhatSinh: new Date('2024-10-10'), hanThanhToan: new Date('2024-11-10'), trangThai: 'DA_THU_MOT_PHAN' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC009', doiTuongTen: 'NCC Cát đá Tây Ninh', soTienGoc: 200000000, daThu: 0, conLai: 200000000, ngayPhatSinh: new Date('2024-08-01'), hanThanhToan: new Date('2024-09-01'), trangThai: 'CHUA_THU' },
  { loai: 'PHAI_TRA', doiTuongId: 'NCC010', doiTuongTen: 'NCC Gỗ nội thất An Cường', soTienGoc: 380000000, daThu: 180000000, conLai: 200000000, ngayPhatSinh: new Date('2024-11-01'), hanThanhToan: new Date('2025-01-01'), trangThai: 'DA_THU_MOT_PHAN' },
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
