/**
 * Seed data for ChungTu (Chứng từ) collection
 */
const { transformBatch, logResult, logError } = require('./utils');

const collectionName = 'chung_tu';

const data = [
  // Phiếu thu
  { soPhieu: 'PT001/2024', loai: 'PHIEU_THU', ngay: new Date('2024-01-15'), soTien: 50000000, noiDung: 'Thu tiền bán hàng - Hợp đồng HD001', doiTuongTen: 'Công ty TNHH ABC', duAnTen: 'Xây dựng nhà máy ABC', taiKhoanNo: '1111', taiKhoanCo: '131', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-15') },
  { soPhieu: 'PT002/2024', loai: 'PHIEU_THU', ngay: new Date('2024-01-18'), soTien: 25000000, noiDung: 'Thu tiền tạm ứng hoàn lại', doiTuongTen: 'Nguyễn Văn Hùng', taiKhoanNo: '1111', taiKhoanCo: '141', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-18') },
  { soPhieu: 'PT003/2024', loai: 'PHIEU_THU', ngay: new Date('2024-01-20'), soTien: 120000000, noiDung: 'Thu tiền bán hàng - Công ty XYZ', doiTuongTen: 'Công ty CP XYZ', duAnTen: 'Cải tạo văn phòng XYZ', taiKhoanNo: '1121', taiKhoanCo: '131', trangThai: 'DA_DUYET', nguoiTao: 'Lê Văn C', ngayTao: new Date('2024-01-20') },
  { soPhieu: 'PT004/2024', loai: 'PHIEU_THU', ngay: new Date('2024-01-22'), soTien: 15000000, noiDung: 'Thu tiền lãi tiền gửi ngân hàng', taiKhoanNo: '1121', taiKhoanCo: '515', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-22') },
  { soPhieu: 'PT005/2024', loai: 'PHIEU_THU', ngay: new Date('2024-01-25'), soTien: 80000000, noiDung: 'Thu tiền bán hàng - Cửa hàng Minh Phát', doiTuongTen: 'Cửa hàng Minh Phát', taiKhoanNo: '1111', taiKhoanCo: '131', trangThai: 'DA_DUYET', nguoiTao: 'Lê Văn C', ngayTao: new Date('2024-01-25') },
  { soPhieu: 'PT006/2024', loai: 'PHIEU_THU', ngay: new Date('2024-01-28'), soTien: 200000000, noiDung: 'Thu tiền thanh lý máy móc cũ', taiKhoanNo: '1111', taiKhoanCo: '711', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-28') },
  { soPhieu: 'PT007/2024', loai: 'PHIEU_THU', ngay: new Date('2024-02-01'), soTien: 500000000, noiDung: 'Thu góp vốn cổ đông', taiKhoanNo: '1121', taiKhoanCo: '411', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-02-01') },
  // Phiếu chi
  { soPhieu: 'PC001/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-10'), soTien: 35000000, noiDung: 'Thanh toán tiền hàng cho NCC Đông Á', doiTuongTen: 'Công ty Vật liệu Xây dựng Đông Á', duAnTen: 'Xây dựng nhà máy ABC', taiKhoanNo: '331', taiKhoanCo: '1111', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-10') },
  { soPhieu: 'PC002/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-12'), soTien: 20000000, noiDung: 'Tạm ứng công tác phí - Nguyễn Văn Hùng', doiTuongTen: 'Nguyễn Văn Hùng', taiKhoanNo: '141', taiKhoanCo: '1111', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-12') },
  { soPhieu: 'PC003/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-15'), soTien: 150000000, noiDung: 'Thanh toán lương tháng 12/2023', taiKhoanNo: '334', taiKhoanCo: '1121', trangThai: 'DA_DUYET', nguoiTao: 'Lê Văn C', ngayTao: new Date('2024-01-15') },
  { soPhieu: 'PC004/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-18'), soTien: 8500000, noiDung: 'Chi phí văn phòng phẩm tháng 01', taiKhoanNo: '642', taiKhoanCo: '1111', trangThai: 'DA_DUYET', nguoiTao: 'Lê Văn C', ngayTao: new Date('2024-01-18') },
  { soPhieu: 'PC005/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-20'), soTien: 25000000, noiDung: 'Thanh toán tiền thuê văn phòng tháng 01', taiKhoanNo: '642', taiKhoanCo: '1121', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-20') },
  { soPhieu: 'PC006/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-22'), soTien: 5000000, noiDung: 'Chi phí tiếp khách', taiKhoanNo: '642', taiKhoanCo: '1111', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-22') },
  { soPhieu: 'PC007/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-25'), soTien: 45000000, noiDung: 'Chi phí vật tư công trình - Thép xây dựng', duAnTen: 'Xây dựng nhà máy ABC', taiKhoanNo: '627', taiKhoanCo: '1111', trangThai: 'DA_DUYET', nguoiTao: 'Lê Văn C', ngayTao: new Date('2024-01-25') },
  { soPhieu: 'PC008/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-01-28'), soTien: 32000000, noiDung: 'Chi phí nhân công công trình B', duAnTen: 'Cải tạo văn phòng XYZ', taiKhoanNo: '622', taiKhoanCo: '1111', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-01-28') },
  { soPhieu: 'PC009/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-02-01'), soTien: 85000000, noiDung: 'Mua máy móc thiết bị mới', taiKhoanNo: '211', taiKhoanCo: '1121', trangThai: 'DA_DUYET', nguoiTao: 'Lê Văn C', ngayTao: new Date('2024-02-01') },
  { soPhieu: 'PC010/2024', loai: 'PHIEU_CHI', ngay: new Date('2024-02-05'), soTien: 30000000, noiDung: 'Trả nợ gốc vay ngân hàng', taiKhoanNo: '341', taiKhoanCo: '1121', trangThai: 'DA_DUYET', nguoiTao: 'Nguyễn Văn A', ngayTao: new Date('2024-02-05') },
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
