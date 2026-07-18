/**
 * Seed data for DoiTuong (Đối tượng) collection
 */
const { seedCollection } = require('./utils');

const collectionName = 'doi_tuong';

const data = [
  // Khách hàng
  { loai: ['KHACH_HANG'], ma: 'KH001', ten: 'Công ty TNHH ABC', diaChi: '123 Nguyễn Huệ, Quận 1, TP.HCM', soDienThoai: '028 1234 5678', email: 'contact@abc.com.vn', maSoThue: '0301234567', nguoiLienHe: 'Nguyễn Văn An' },
  { loai: ['KHACH_HANG'], ma: 'KH002', ten: 'Công ty CP XYZ', diaChi: '456 Lê Lợi, Quận 3, TP.HCM', soDienThoai: '028 2345 6789', email: 'info@xyz.vn', maSoThue: '0302345678', nguoiLienHe: 'Trần Thị Bình' },
  { loai: ['KHACH_HANG'], ma: 'KH003', ten: 'Cửa hàng Minh Phát', diaChi: '789 Hai Bà Trưng, Quận 1, TP.HCM', soDienThoai: '0909 123 456', email: 'minhphat@gmail.com', nguoiLienHe: 'Lê Minh Phát' },
  { loai: ['KHACH_HANG'], ma: 'KH004', ten: 'Công ty TNHH Thành Công', diaChi: '321 Võ Văn Tần, Quận 3, TP.HCM', soDienThoai: '028 3456 7890', email: 'thanhcong@company.vn', maSoThue: '0303456789', nguoiLienHe: 'Phạm Văn Thành' },
  // Nhà cung cấp
  { loai: ['NHA_CUNG_CAP'], ma: 'NCC001', ten: 'Công ty Vật liệu Xây dựng Đông Á', diaChi: '100 Quốc lộ 1A, Bình Chánh, TP.HCM', soDienThoai: '028 4567 8901', email: 'dongavn@materials.vn', maSoThue: '0304567890', nguoiLienHe: 'Hoàng Đông' },
  { loai: ['NHA_CUNG_CAP'], ma: 'NCC002', ten: 'Công ty Thiết bị Văn phòng VPS', diaChi: '200 Cách Mạng Tháng 8, Quận 10, TP.HCM', soDienThoai: '028 5678 9012', email: 'vps@office.vn', maSoThue: '0305678901', nguoiLienHe: 'Nguyễn Thị Lan' },
  { loai: ['NHA_CUNG_CAP'], ma: 'NCC003', ten: 'Công ty TNHH Điện máy Thịnh Phát', diaChi: '88 Nguyễn Thị Minh Khai, Quận 3, TP.HCM', soDienThoai: '028 6789 0123', email: 'thinhphat@dienmy.vn', maSoThue: '0306789012', nguoiLienHe: 'Trần Thịnh' },
  // Nhân viên
  { loai: ['NHAN_VIEN'], ma: 'NV001', ten: 'Nguyễn Văn Hùng', diaChi: '55 Phan Đăng Lưu, Phú Nhuận, TP.HCM', soDienThoai: '0912 345 678', email: 'hung.nv@company.vn' },
  { loai: ['NHAN_VIEN'], ma: 'NV002', ten: 'Trần Thị Mai', diaChi: '77 Lý Thường Kiệt, Quận 10, TP.HCM', soDienThoai: '0923 456 789', email: 'mai.tt@company.vn' },
  { loai: ['NHAN_VIEN'], ma: 'NV003', ten: 'Lê Văn Tâm', diaChi: '99 Nguyễn Đình Chiểu, Quận 3, TP.HCM', soDienThoai: '0934 567 890', email: 'tam.lv@company.vn' },
  // Nhà thầu
  { loai: ['NHA_THAU'], ma: 'NT001', ten: 'Công ty Xây dựng Phú Cường', diaChi: '150 Điện Biên Phủ, Bình Thạnh, TP.HCM', soDienThoai: '028 7890 1234', email: 'phucuong@xaydung.vn', maSoThue: '0307890123', nguoiLienHe: 'Nguyễn Phú Cường' },
  { loai: ['NHA_THAU'], ma: 'NT002', ten: 'Công ty TNHH Thi công Hoàng Long', diaChi: '250 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM', soDienThoai: '028 8901 2345', email: 'hoanglong@thicong.vn', maSoThue: '0308901234', nguoiLienHe: 'Hoàng Long' },
];

async function seed(db, options = {}) {
  return seedCollection(db, collectionName, data, options);
}

async function clear(db) {
  await db.collection(collectionName).deleteMany({});
}

module.exports = { collectionName, data, seed, clear };
