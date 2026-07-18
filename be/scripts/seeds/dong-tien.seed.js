/**
 * Seed data for DongTien (Dòng tiền) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'dong_tien';

const data = [
  { ma: 'DT001', ten: 'Thu từ bán hàng', loai: 'KINH_DOANH', moTa: 'Doanh thu từ hoạt động bán hàng, cung cấp dịch vụ' },
  { ma: 'DT002', ten: 'Thu từ công nợ phải thu', loai: 'KINH_DOANH', moTa: 'Thu hồi các khoản phải thu từ khách hàng' },
  { ma: 'DT003', ten: 'Chi trả nhà cung cấp', loai: 'KINH_DOANH', moTa: 'Thanh toán tiền hàng cho nhà cung cấp' },
  { ma: 'DT004', ten: 'Chi lương nhân viên', loai: 'KINH_DOANH', moTa: 'Chi trả lương và các khoản phụ cấp cho nhân viên' },
  { ma: 'DT005', ten: 'Chi phí hoạt động', loai: 'KINH_DOANH', moTa: 'Chi phí vận hành, điện nước, văn phòng phẩm' },
  { ma: 'DT006', ten: 'Thu từ thanh lý TSCĐ', loai: 'DAU_TU', moTa: 'Tiền thu từ thanh lý, nhượng bán tài sản cố định' },
  { ma: 'DT007', ten: 'Chi mua TSCĐ', loai: 'DAU_TU', moTa: 'Chi tiền mua sắm tài sản cố định' },
  { ma: 'DT008', ten: 'Chi đầu tư dự án', loai: 'DAU_TU', moTa: 'Chi phí đầu tư vào các dự án mới' },
  { ma: 'DT009', ten: 'Thu từ vay ngân hàng', loai: 'TAI_CHINH', moTa: 'Tiền nhận được từ các khoản vay' },
  { ma: 'DT010', ten: 'Chi trả nợ vay', loai: 'TAI_CHINH', moTa: 'Chi tiền trả nợ gốc và lãi vay' },
  { ma: 'DT011', ten: 'Thu góp vốn', loai: 'TAI_CHINH', moTa: 'Tiền nhận được từ góp vốn cổ đông' },
  { ma: 'DT012', ten: 'Chi trả cổ tức', loai: 'TAI_CHINH', moTa: 'Chi trả cổ tức cho cổ đông' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
