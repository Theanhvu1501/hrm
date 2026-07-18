/**
 * Seed data for KhoanMuc (Khoản mục) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'khoan_muc';

const data = [
  // Chi phí
  { ma: 'CP001', ten: 'Chi phí xi măng', loai: 'CHI_PHI', nhom: 'CHI_PHI_NGUYEN_VAT_LIEU' },
  { ma: 'CP002', ten: 'Chi phí thép xây dựng', loai: 'CHI_PHI', nhom: 'CHI_PHI_NGUYEN_VAT_LIEU' },
  { ma: 'CP003', ten: 'Chi phí cát, đá', loai: 'CHI_PHI', nhom: 'CHI_PHI_NGUYEN_VAT_LIEU' },
  { ma: 'CP004', ten: 'Lương công nhân', loai: 'CHI_PHI', nhom: 'CHI_PHI_NHAN_CONG' },
  { ma: 'CP005', ten: 'Bảo hiểm xã hội', loai: 'CHI_PHI', nhom: 'CHI_PHI_NHAN_CONG' },
  { ma: 'CP006', ten: 'Thuê máy xúc', loai: 'CHI_PHI', nhom: 'CHI_PHI_MAY_MOC' },
  { ma: 'CP007', ten: 'Thuê cẩu', loai: 'CHI_PHI', nhom: 'CHI_PHI_MAY_MOC' },
  { ma: 'CP008', ten: 'Chi phí văn phòng phẩm', loai: 'CHI_PHI', nhom: 'CHI_PHI_QUAN_LY' },
  { ma: 'CP009', ten: 'Chi phí điện nước', loai: 'CHI_PHI', nhom: 'CHI_PHI_QUAN_LY' },
  { ma: 'CP010', ten: 'Lãi vay ngân hàng', loai: 'CHI_PHI', nhom: 'CHI_PHI_TAI_CHINH' },
  // Doanh thu
  { ma: 'DT001', ten: 'Doanh thu xây dựng công trình', loai: 'DOANH_THU', nhom: 'DOANH_THU_DICH_VU' },
  { ma: 'DT002', ten: 'Doanh thu tư vấn thiết kế', loai: 'DOANH_THU', nhom: 'DOANH_THU_DICH_VU' },
  { ma: 'DT003', ten: 'Doanh thu bán vật liệu', loai: 'DOANH_THU', nhom: 'DOANH_THU_BAN_HANG' },
  { ma: 'DT004', ten: 'Lãi tiền gửi ngân hàng', loai: 'DOANH_THU', nhom: 'DOANH_THU_TAI_CHINH' },
  { ma: 'DT005', ten: 'Thu nhập từ thanh lý tài sản', loai: 'DOANH_THU', nhom: 'DOANH_THU_KHAC' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
