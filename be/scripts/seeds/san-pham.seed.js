/**
 * Seed data for SanPham (Sản phẩm) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'san_pham';

const data = [
  { ma: 'SP001', ten: 'Xi măng Hà Tiên PCB40', donVi: 'Tấn', giaBan: 2100000, nhom: 'NGUYEN_VAT_LIEU', moTa: 'Xi măng Portland hỗn hợp PCB40, bao 50kg' },
  { ma: 'SP002', ten: 'Thép xây dựng D10', donVi: 'Tấn', giaBan: 15500000, nhom: 'NGUYEN_VAT_LIEU', moTa: 'Thép thanh vằn D10, tiêu chuẩn CB300-V' },
  { ma: 'SP003', ten: 'Gạch ống 4 lỗ', donVi: 'Viên', giaBan: 1200, nhom: 'NGUYEN_VAT_LIEU', moTa: 'Gạch ống đất sét nung 4 lỗ, kích thước 8x8x18cm' },
  { ma: 'SP004', ten: 'Cát xây dựng', donVi: 'M³', giaBan: 350000, nhom: 'NGUYEN_VAT_LIEU', moTa: 'Cát vàng xây dựng, độ mịn 2.0-2.5' },
  { ma: 'SP005', ten: 'Đá 1x2', donVi: 'M³', giaBan: 420000, nhom: 'NGUYEN_VAT_LIEU', moTa: 'Đá dăm 1x2 xây dựng' },
  { ma: 'DV001', ten: 'Dịch vụ tư vấn thiết kế', donVi: 'Dịch vụ', giaBan: 50000000, nhom: 'DICH_VU', moTa: 'Dịch vụ tư vấn và lập hồ sơ thiết kế công trình' },
  { ma: 'DV002', ten: 'Dịch vụ giám sát thi công', donVi: 'Dịch vụ', giaBan: 30000000, nhom: 'DICH_VU', moTa: 'Dịch vụ giám sát thi công công trình xây dựng' },
  { ma: 'SP006', ten: 'Ống nhựa PVC D90', donVi: 'Mét', giaBan: 45000, nhom: 'VAT_TU', moTa: 'Ống nhựa PVC đường kính 90mm, độ dày 3mm' },
  { ma: 'SP007', ten: 'Dây điện 2.5mm Cadivi', donVi: 'Mét', giaBan: 12000, nhom: 'VAT_TU', moTa: 'Dây điện đơn Cadivi lõi đồng 2.5mm²' },
  { ma: 'SP008', ten: 'Sơn nước nội thất Dulux', donVi: 'Lít', giaBan: 185000, nhom: 'VAT_TU', moTa: 'Sơn nước nội thất Dulux Inspire, màu trắng' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
