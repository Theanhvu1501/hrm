/**
 * Seed data for TaiKhoan (Tài khoản kế toán) collection
 * Loại tài khoản: TAI_SAN, NO_PHAI_TRA, VON_CHU_SO_HUU, DOANH_THU, CHI_PHI, THU_NHAP_KHAC, CHI_PHI_KHAC, XAC_DINH_KQKD
 * Nhóm tài khoản: NO (Nợ), CO (Có), LUONG_TINH (Lưỡng tính), KHONG_CO_SO_DU (Không có số dư)
 */
const { seedCollection } = require('./utils');

const collectionName = 'tai_khoan';

const data = [
  // Loại 1: Tài sản
  { ma: '111', ten: 'Tiền mặt', capDo: 1, loai: 'TAI_SAN', nhom: 'NO', moTa: 'Tiền mặt tại quỹ của doanh nghiệp' },
  { ma: '1111', ten: 'Tiền Việt Nam', capDo: 2, loai: 'TAI_SAN', nhom: 'NO', parentId: '111', moTa: 'Tiền mặt bằng VND' },
  { ma: '1112', ten: 'Ngoại tệ', capDo: 2, loai: 'TAI_SAN', nhom: 'NO', parentId: '111', moTa: 'Tiền mặt bằng ngoại tệ' },
  { ma: '112', ten: 'Tiền gửi ngân hàng', capDo: 1, loai: 'TAI_SAN', nhom: 'NO', moTa: 'Tiền gửi tại các ngân hàng' },
  { ma: '1121', ten: 'Tiền Việt Nam', capDo: 2, loai: 'TAI_SAN', nhom: 'NO', parentId: '112', moTa: 'Tiền gửi VND tại ngân hàng' },
  { ma: '131', ten: 'Phải thu của khách hàng', capDo: 1, loai: 'TAI_SAN', nhom: 'LUONG_TINH', moTa: 'Các khoản phải thu từ khách hàng' },
  { ma: '141', ten: 'Tạm ứng', capDo: 1, loai: 'TAI_SAN', nhom: 'NO', moTa: 'Các khoản tạm ứng cho nhân viên' },
  { ma: '152', ten: 'Nguyên liệu, vật liệu', capDo: 1, loai: 'TAI_SAN', nhom: 'NO', moTa: 'Nguyên vật liệu tồn kho' },
  { ma: '211', ten: 'Tài sản cố định hữu hình', capDo: 1, loai: 'TAI_SAN', nhom: 'NO', moTa: 'TSCĐ hữu hình' },
  { ma: '2111', ten: 'Nhà cửa, vật kiến trúc', capDo: 2, loai: 'TAI_SAN', nhom: 'NO', parentId: '211' },
  { ma: '2112', ten: 'Máy móc, thiết bị', capDo: 2, loai: 'TAI_SAN', nhom: 'NO', parentId: '211' },
  { ma: '214', ten: 'Hao mòn TSCĐ', capDo: 1, loai: 'TAI_SAN', nhom: 'CO', moTa: 'Khấu hao tài sản cố định' },
  // Loại 3: Nợ phải trả
  { ma: '331', ten: 'Phải trả cho người bán', capDo: 1, loai: 'NO_PHAI_TRA', nhom: 'LUONG_TINH', moTa: 'Các khoản phải trả nhà cung cấp' },
  { ma: '333', ten: 'Thuế và các khoản phải nộp NN', capDo: 1, loai: 'NO_PHAI_TRA', nhom: 'CO', moTa: 'Thuế và các khoản nộp nhà nước' },
  { ma: '3331', ten: 'Thuế GTGT phải nộp', capDo: 2, loai: 'NO_PHAI_TRA', nhom: 'CO', parentId: '333' },
  { ma: '334', ten: 'Phải trả người lao động', capDo: 1, loai: 'NO_PHAI_TRA', nhom: 'CO', moTa: 'Lương và các khoản phải trả nhân viên' },
  { ma: '341', ten: 'Vay và nợ thuê tài chính', capDo: 1, loai: 'NO_PHAI_TRA', nhom: 'CO', moTa: 'Các khoản vay ngắn và dài hạn' },
  // Loại 4: Vốn chủ sở hữu
  { ma: '411', ten: 'Vốn đầu tư của chủ sở hữu', capDo: 1, loai: 'VON_CHU_SO_HUU', nhom: 'CO', moTa: 'Vốn góp của chủ sở hữu' },
  { ma: '421', ten: 'Lợi nhuận sau thuế chưa phân phối', capDo: 1, loai: 'VON_CHU_SO_HUU', nhom: 'CO', moTa: 'Lợi nhuận giữ lại' },
  // Loại 5: Doanh thu
  { ma: '511', ten: 'Doanh thu bán hàng và cung cấp DV', capDo: 1, loai: 'DOANH_THU', nhom: 'KHONG_CO_SO_DU', moTa: 'Doanh thu từ hoạt động kinh doanh chính' },
  { ma: '515', ten: 'Doanh thu hoạt động tài chính', capDo: 1, loai: 'DOANH_THU', nhom: 'KHONG_CO_SO_DU', moTa: 'Lãi tiền gửi, lãi đầu tư...' },
  // Loại 7: Thu nhập khác
  { ma: '711', ten: 'Thu nhập khác', capDo: 1, loai: 'THU_NHAP_KHAC', nhom: 'KHONG_CO_SO_DU', moTa: 'Thu nhập khác ngoài hoạt động kinh doanh' },
  // Loại 6: Chi phí
  { ma: '621', ten: 'Chi phí nguyên vật liệu trực tiếp', capDo: 1, loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU', moTa: 'NVL sử dụng trực tiếp sản xuất' },
  { ma: '622', ten: 'Chi phí nhân công trực tiếp', capDo: 1, loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU', moTa: 'Lương nhân công sản xuất trực tiếp' },
  { ma: '627', ten: 'Chi phí sản xuất chung', capDo: 1, loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU', moTa: 'Chi phí sản xuất chung' },
  { ma: '635', ten: 'Chi phí tài chính', capDo: 1, loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU', moTa: 'Lãi vay, chi phí tài chính khác' },
  { ma: '641', ten: 'Chi phí bán hàng', capDo: 1, loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU', moTa: 'Chi phí liên quan đến bán hàng' },
  { ma: '642', ten: 'Chi phí quản lý doanh nghiệp', capDo: 1, loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU', moTa: 'Chi phí quản lý chung' },
  // Loại 8: Chi phí khác
  { ma: '811', ten: 'Chi phí khác', capDo: 1, loai: 'CHI_PHI_KHAC', nhom: 'KHONG_CO_SO_DU', moTa: 'Chi phí khác ngoài hoạt động kinh doanh' },
  // Loại 9: Xác định kết quả kinh doanh
  { ma: '911', ten: 'Xác định kết quả kinh doanh', capDo: 1, loai: 'XAC_DINH_KQKD', nhom: 'KHONG_CO_SO_DU', moTa: 'Xác định kết quả kinh doanh' },
];

async function seed(db, options = {}) {
  // Pre-generate ObjectIds and build ma->_id map for parentId resolution
  const { transformBatch } = require('./utils');
  const documents = transformBatch(data);
  const maToId = new Map();
  documents.forEach(doc => {
    maToId.set(doc.ma, doc._id.toString());
  });

  // Resolve parentId from ma to ObjectId
  documents.forEach(doc => {
    if (doc.parentId && maToId.has(doc.parentId)) {
      doc.parentId = maToId.get(doc.parentId);
    }
  });

  const { clearBefore = false, dryRun = false } = options;
  const collection = db.collection(collectionName);

  if (clearBefore && !dryRun) {
    await collection.deleteMany({});
    console.log(`🗑️  ${collectionName}: Cleared existing data`);
  }

  if (dryRun) {
    console.log(`🔍 ${collectionName}: Would insert ${documents.length} records (dry run)`);
    return { inserted: 0, dryRun: true };
  }

  const result = await collection.insertMany(documents);
  console.log(`📦 ${collectionName}: Inserted ${result.insertedCount} records`);
  return { inserted: result.insertedCount };
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
