/**
 * Seed data for QuyChuan (Quy chuẩn hạch toán) collection
 */
const { transformBatch, logResult, logError } = require('./utils');

const collectionName = 'quy_chuan';

const data = [
  // Phiếu thu
  { loaiGiaoDich: 'THU_BAN_HANG', nghiepVu: 'Thu tiền bán hàng', taiKhoanNo: '111', taiKhoanCo: '511', moTa: 'Thu tiền mặt bán hàng hóa, dịch vụ' },
  { loaiGiaoDich: 'THU_CONG_NO_KH', nghiepVu: 'Thu tiền công nợ khách hàng', taiKhoanNo: '111', taiKhoanCo: '131', moTa: 'Thu tiền mặt từ khách hàng thanh toán công nợ' },
  { loaiGiaoDich: 'THU_LAI_TIEN_GUI', nghiepVu: 'Thu lãi tiền gửi', taiKhoanNo: '111', taiKhoanCo: '515', moTa: 'Thu lãi tiền gửi ngân hàng bằng tiền mặt' },
  { loaiGiaoDich: 'THU_HOAN_UNG', nghiepVu: 'Thu hoàn ứng', taiKhoanNo: '111', taiKhoanCo: '141', moTa: 'Thu hoàn ứng từ nhân viên' },
  { loaiGiaoDich: 'THU_KHAC', nghiepVu: 'Thu tiền khác', taiKhoanNo: '111', taiKhoanCo: '711', moTa: 'Thu nhập khác bằng tiền mặt' },
  { loaiGiaoDich: 'RUT_TIEN_VE_QUY', nghiepVu: 'Rút tiền gửi về quỹ', taiKhoanNo: '111', taiKhoanCo: '112', moTa: 'Rút tiền từ ngân hàng về quỹ tiền mặt' },
  // Phiếu chi
  { loaiGiaoDich: 'CHI_MUA_HANG', nghiepVu: 'Chi mua hàng hóa', taiKhoanNo: '152', taiKhoanCo: '111', moTa: 'Chi tiền mặt mua nguyên vật liệu, hàng hóa' },
  { loaiGiaoDich: 'CHI_TRA_NCC', nghiepVu: 'Chi trả nhà cung cấp', taiKhoanNo: '331', taiKhoanCo: '111', moTa: 'Chi trả công nợ cho nhà cung cấp' },
  { loaiGiaoDich: 'CHI_LUONG', nghiepVu: 'Chi lương nhân viên', taiKhoanNo: '334', taiKhoanCo: '111', moTa: 'Chi trả lương cho nhân viên' },
  { loaiGiaoDich: 'CHI_PHI_BAN_HANG', nghiepVu: 'Chi phí bán hàng', taiKhoanNo: '641', taiKhoanCo: '111', moTa: 'Chi phí vận chuyển, quảng cáo, khuyến mãi' },
  { loaiGiaoDich: 'CHI_PHI_QUAN_LY', nghiepVu: 'Chi phí quản lý', taiKhoanNo: '642', taiKhoanCo: '111', moTa: 'Chi phí văn phòng, điện nước, thuê mặt bằng' },
  { loaiGiaoDich: 'CHI_TAM_UNG', nghiepVu: 'Chi tạm ứng', taiKhoanNo: '141', taiKhoanCo: '111', moTa: 'Tạm ứng tiền cho nhân viên' },
  { loaiGiaoDich: 'CHI_NOP_THUE', nghiepVu: 'Chi nộp thuế', taiKhoanNo: '333', taiKhoanCo: '111', moTa: 'Chi nộp các khoản thuế cho nhà nước' },
  { loaiGiaoDich: 'CHI_TRA_LAI_VAY', nghiepVu: 'Chi trả lãi vay', taiKhoanNo: '635', taiKhoanCo: '111', moTa: 'Chi trả lãi vay ngân hàng, tổ chức tín dụng' },
  { loaiGiaoDich: 'CHI_KHAC', nghiepVu: 'Chi khác', taiKhoanNo: '811', taiKhoanCo: '111', moTa: 'Chi phí khác bằng tiền mặt' },
  { loaiGiaoDich: 'NOP_TIEN_NGAN_HANG', nghiepVu: 'Nộp tiền vào ngân hàng', taiKhoanNo: '112', taiKhoanCo: '111', moTa: 'Nộp tiền mặt vào tài khoản ngân hàng' },
  // Báo có ngân hàng
  { loaiGiaoDich: 'BAO_CO_BAN_HANG', nghiepVu: 'Thu tiền bán hàng CK', taiKhoanNo: '112', taiKhoanCo: '511', moTa: 'Khách hàng chuyển khoản thanh toán tiền hàng' },
  { loaiGiaoDich: 'BAO_CO_CONG_NO', nghiepVu: 'Thu công nợ qua CK', taiKhoanNo: '112', taiKhoanCo: '131', moTa: 'Khách hàng chuyển khoản trả công nợ' },
  { loaiGiaoDich: 'BAO_CO_LAI_TIEN_GUI', nghiepVu: 'Thu lãi tiền gửi (CK)', taiKhoanNo: '112', taiKhoanCo: '515', moTa: 'Ngân hàng ghi có lãi tiền gửi' },
  // Báo nợ ngân hàng
  { loaiGiaoDich: 'BAO_NO_MUA_HANG', nghiepVu: 'Chi mua hàng CK', taiKhoanNo: '152', taiKhoanCo: '112', moTa: 'Chuyển khoản mua nguyên vật liệu, hàng hóa' },
  { loaiGiaoDich: 'BAO_NO_TRA_NCC', nghiepVu: 'Chi trả NCC qua CK', taiKhoanNo: '331', taiKhoanCo: '112', moTa: 'Chuyển khoản trả công nợ nhà cung cấp' },
  { loaiGiaoDich: 'BAO_NO_LUONG', nghiepVu: 'Chi lương qua CK', taiKhoanNo: '334', taiKhoanCo: '112', moTa: 'Chuyển khoản trả lương nhân viên' },
  { loaiGiaoDich: 'BAO_NO_PHI_NH', nghiepVu: 'Chi phí ngân hàng', taiKhoanNo: '642', taiKhoanCo: '112', moTa: 'Phí dịch vụ ngân hàng' },
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
