/**
 * Seed data for BoPhan (Bộ phận) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'bo_phan';

const data = [
  { ma: 'BP001', ten: 'Ban Giám đốc', moTa: 'Quản lý điều hành toàn bộ hoạt động công ty' },
  { ma: 'BP002', ten: 'Phòng Kế toán - Tài chính', moTa: 'Quản lý tài chính, kế toán, thuế và ngân sách' },
  { ma: 'BP003', ten: 'Phòng Nhân sự', moTa: 'Tuyển dụng, đào tạo và quản lý nhân sự' },
  { ma: 'BP004', ten: 'Phòng Kinh doanh', moTa: 'Phát triển khách hàng và bán hàng' },
  { ma: 'BP005', ten: 'Phòng Kỹ thuật', moTa: 'Thiết kế, giám sát kỹ thuật công trình' },
  { ma: 'BP006', ten: 'Phòng Dự án', moTa: 'Quản lý tiến độ và thực hiện các dự án' },
  { ma: 'BP007', ten: 'Phòng Mua hàng', moTa: 'Mua sắm vật tư, thiết bị và quản lý nhà cung cấp' },
  { ma: 'BP008', ten: 'Phòng Hành chính', moTa: 'Quản lý hành chính, văn phòng phẩm và cơ sở vật chất' },
  { ma: 'BP009', ten: 'Đội thi công số 1', moTa: 'Đội thi công xây dựng tại công trường' },
  { ma: 'BP010', ten: 'Đội thi công số 2', moTa: 'Đội thi công xây dựng tại công trường' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
