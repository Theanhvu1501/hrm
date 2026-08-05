/** Nhãn tiếng Việt cho các mã cảnh báo backend gắn vào từng ô bảng công. */
export const NHAN_CANH_BAO: Record<string, string> = {
  thieu_gio_ra: 'Có chấm vào nhưng thiếu giờ ra',
  don_va_cham_cong: 'Vừa có đơn nghỉ đã duyệt vừa có chấm công — một trong hai sai',
  ngoai_vung: 'Có lượt chấm công ngoài bán kính địa điểm',
  chua_xu_ly: 'Ngày làm việc nhưng không có căn cứ nào để điền',
  sau_ngay_nghi_viec:
    'Có dữ liệu chấm công sau ngày làm việc cuối — kiểm tra lại hồ sơ thôi việc',
  truoc_ngay_vao_lam:
    'Có dữ liệu chấm công trước ngày vào làm — kiểm tra lại hồ sơ nhân viên',
  lam_ngoai_lich_tuan:
    'Có chấm công ngoài lịch làm việc trong tuần (vd đi làm thứ Bảy) — giờ này tính vào làm thêm, không phải một ngày công',
};

/** Mã lạ trả nguyên chuỗi: thà hiện mã còn hơn ô trống không giải thích được. */
export function nhanCanhBao(ma: string): string {
  return NHAN_CANH_BAO[ma] ?? ma;
}

/** Gộp nhiều mã cảnh báo của một ô thành một dòng tooltip tiếng Việt. */
export function moTaCanhBao(danhSach?: string[]): string {
  if (!danhSach || danhSach.length === 0) return '';
  return danhSach.map(nhanCanhBao).join('; ');
}
