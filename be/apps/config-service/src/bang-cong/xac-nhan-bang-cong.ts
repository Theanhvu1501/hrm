/**
 * Quy tắc GỬI BẢNG CÔNG CHO NGƯỜI LAO ĐỘNG XÁC NHẬN (yêu cầu d19).
 *
 * Tách thành hàm thuần vì đây là chỗ dễ sai nhất và sai thì không nhìn thấy
 * được: "đã quá hạn chưa" phụ thuộc ngày hôm nay, và một so sánh lệch một
 * ngày nghĩa là người lao động mất quyền phản hồi sớm một ngày, hoặc bảng
 * công đáng lẽ khoá rồi vẫn sửa được.
 */

export type TrangThaiXacNhan =
  | 'chua_gui'
  | 'cho_xac_nhan'
  | 'da_xac_nhan'
  | 'de_nghi_dieu_chinh';

export interface BangCongXacNhan {
  trangThaiXacNhan?: string;
  hanXacNhan?: string;
}

/**
 * Đã quá hạn phản hồi chưa.
 *
 * So sánh chuỗi "YYYY-MM-DD" — hợp lệ vì cùng định dạng cố định độ dài, và
 * tránh hẳn chuyện lệch múi giờ khi dựng `Date` từ chuỗi ngày.
 *
 * Hết hạn là SAU ngày `hanXacNhan`: đặt hạn 20/09 nghĩa là hết ngày 20/09 vẫn
 * còn phản hồi được. Đổi thành `>=` là cắt mất trọn một ngày của người ta.
 */
export function daQuaHan(bang: BangCongXacNhan, homNay: string): boolean {
  if (!bang.hanXacNhan) return false;
  return homNay > bang.hanXacNhan;
}

/**
 * Bảng công còn nhận phản hồi của NLĐ không.
 *
 * Chỉ khi ĐANG chờ xác nhận và chưa quá hạn. Đã xác nhận rồi thì thôi (bấm
 * lại lần hai là ghi đè chính ý kiến mình vừa gửi); đã đề nghị điều chỉnh thì
 * cũng thôi — bóng đang ở sân C&B, gửi thêm là chồng đề nghị lên nhau mà
 * người xử lý không biết cái nào mới.
 */
export function conNhanPhanHoi(
  bang: BangCongXacNhan,
  homNay: string,
): boolean {
  return bang.trangThaiXacNhan === 'cho_xac_nhan' && !daQuaHan(bang, homNay);
}

/**
 * Nhãn trạng thái để hiển thị — gồm cả trạng thái SUY RA "tự động khoá" mà
 * cột trong DB không có.
 */
export function nhanTrangThaiXacNhan(
  bang: BangCongXacNhan,
  homNay: string,
): string {
  const tt = bang.trangThaiXacNhan ?? 'chua_gui';
  if (tt === 'cho_xac_nhan' && daQuaHan(bang, homNay)) {
    return 'Quá hạn — tự động khoá';
  }
  switch (tt) {
    case 'cho_xac_nhan':
      return 'Chờ nhân viên xác nhận';
    case 'da_xac_nhan':
      return 'Nhân viên đã xác nhận';
    case 'de_nghi_dieu_chinh':
      return 'Nhân viên đề nghị điều chỉnh';
    default:
      return 'Chưa gửi';
  }
}
