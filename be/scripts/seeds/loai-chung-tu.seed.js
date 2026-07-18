/**
 * Seed data for LoaiChungTu (Loại chứng từ) collection
 * Dựa trên các loại giao dịch trong quy chuẩn hạch toán
 */
const { transformBatch, logResult, logError } = require('./utils');

const collectionName = 'loai_chung_tu';

const data = [
  // Phiếu thu
  { ma: 'THU_BAN_HANG', ten: 'Thu tiền bán hàng', moTa: 'Thu tiền mặt bán hàng hóa, dịch vụ' },
  { ma: 'THU_CONG_NO_KH', ten: 'Thu tiền công nợ khách hàng', moTa: 'Thu tiền mặt từ khách hàng thanh toán công nợ' },
  { ma: 'THU_LAI_TIEN_GUI', ten: 'Thu lãi tiền gửi', moTa: 'Thu lãi tiền gửi ngân hàng bằng tiền mặt' },
  { ma: 'THU_HOAN_UNG', ten: 'Thu hoàn ứng', moTa: 'Thu hoàn ứng từ nhân viên' },
  { ma: 'THU_KHAC', ten: 'Thu tiền khác', moTa: 'Thu nhập khác bằng tiền mặt' },
  { ma: 'RUT_TIEN_VE_QUY', ten: 'Rút tiền gửi về quỹ', moTa: 'Rút tiền từ ngân hàng về quỹ tiền mặt' },
  
  // Phiếu chi
  { ma: 'CHI_MUA_HANG', ten: 'Chi mua hàng hóa', moTa: 'Chi tiền mặt mua nguyên vật liệu, hàng hóa' },
  { ma: 'CHI_TRA_NCC', ten: 'Chi trả nhà cung cấp', moTa: 'Chi trả công nợ cho nhà cung cấp' },
  { ma: 'CHI_LUONG', ten: 'Chi lương nhân viên', moTa: 'Chi trả lương cho nhân viên' },
  { ma: 'CHI_PHI_BAN_HANG', ten: 'Chi phí bán hàng', moTa: 'Chi phí vận chuyển, quảng cáo, khuyến mãi' },
  { ma: 'CHI_PHI_QUAN_LY', ten: 'Chi phí quản lý', moTa: 'Chi phí văn phòng, điện nước, thuê mặt bằng' },
  { ma: 'CHI_TAM_UNG', ten: 'Chi tạm ứng', moTa: 'Tạm ứng tiền cho nhân viên' },
  { ma: 'CHI_NOP_THUE', ten: 'Chi nộp thuế', moTa: 'Chi nộp các khoản thuế cho nhà nước' },
  { ma: 'CHI_TRA_LAI_VAY', ten: 'Chi trả lãi vay', moTa: 'Chi trả lãi vay ngân hàng, tổ chức tín dụng' },
  { ma: 'CHI_KHAC', ten: 'Chi khác', moTa: 'Chi phí khác bằng tiền mặt' },
  { ma: 'NOP_TIEN_NGAN_HANG', ten: 'Nộp tiền vào ngân hàng', moTa: 'Nộp tiền mặt vào tài khoản ngân hàng' },
  
  // Báo có ngân hàng
  { ma: 'BAO_CO_BAN_HANG', ten: 'Thu tiền bán hàng CK', moTa: 'Khách hàng chuyển khoản thanh toán tiền hàng' },
  { ma: 'BAO_CO_CONG_NO', ten: 'Thu công nợ qua CK', moTa: 'Khách hàng chuyển khoản trả công nợ' },
  { ma: 'BAO_CO_LAI_TIEN_GUI', ten: 'Thu lãi tiền gửi (CK)', moTa: 'Ngân hàng ghi có lãi tiền gửi' },
  
  // Báo nợ ngân hàng
  { ma: 'BAO_NO_MUA_HANG', ten: 'Chi mua hàng CK', moTa: 'Chuyển khoản mua nguyên vật liệu, hàng hóa' },
  { ma: 'BAO_NO_TRA_NCC', ten: 'Chi trả NCC qua CK', moTa: 'Chuyển khoản trả công nợ nhà cung cấp' },
  { ma: 'BAO_NO_LUONG', ten: 'Chi lương qua CK', moTa: 'Chuyển khoản trả lương nhân viên' },
  { ma: 'BAO_NO_PHI_NH', ten: 'Chi phí ngân hàng', moTa: 'Phí dịch vụ ngân hàng' },
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
