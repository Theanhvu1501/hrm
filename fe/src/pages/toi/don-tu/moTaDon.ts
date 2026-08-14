import { AttendanceRequest } from "@/services/attendanceRequestService";
import { BUOI_OPTIONS, LOAI_NGHI_OPTIONS, labelFor } from "@/pages/cham-cong/don-cham-cong/constants";

/** "2026-07-24" → "24/07/2026". Chuỗi rỗng/hỏng thì trả nguyên xi, không bịa. */
export function ngayVN(ngay?: string): string {
  if (!ngay) return "";
  const [nam, thang, ngayTrongThang] = ngay.split("-");
  if (!nam || !thang || !ngayTrongThang) return ngay;
  return `${ngayTrongThang}/${thang}/${nam}`;
}

/**
 * Dòng ngày của một đơn: một ngày thì một ngày, khoảng thì hai đầu.
 *
 * `denNgay` bằng `ngay` KHÔNG được hiện thành khoảng — "24/07/2026 –
 * 24/07/2026" đọc như lỗi hiển thị, mà đơn nghỉ một ngày là trường hợp phổ
 * biến nhất (backend luôn nhận denNgay = ngay cho đơn nghỉ một ngày, xem
 * dungDtoNopDon).
 */
export function khoangNgay(don: AttendanceRequest): string {
  const dau = ngayVN(don.ngay);
  if (!don.denNgay || don.denNgay === don.ngay) return dau;
  return `${dau} – ${ngayVN(don.denNgay)}`;
}

/**
 * Dòng phụ: các con số BACKEND TỰ TÍNH (soNgayNghi/soGioOt/heSoOt) cộng với
 * khung giờ và loại nghỉ. Đây là thứ người vừa nộp đơn nhìn để biết mình khai
 * đúng chưa.
 *
 * Dùng `!== undefined` chứ KHÔNG dùng `if (don.soGioOt)`: `0` là giá trị THẬT
 * (đơn OT khai giờ từ = giờ đến thì backend tính ra 0 giờ) và người dùng cần
 * thấy đúng con số 0 để biết đơn của mình vô nghĩa, thay vì thấy một dòng
 * trống rồi tưởng hệ thống chưa tính.
 */
export function dongPhu(don: AttendanceRequest): string {
  const phan: string[] = [];

  // Đơn online: chỉ có buổi. Để rơi xuống nhánh OT bên dưới thì một cái đơn
  // xin làm ở nhà sẽ hiện "0 giờ OT" — số thật, sai ngữ cảnh.
  if (don.loaiDon === "lam_online") {
    if (don.buoi && don.buoi !== "ca_ngay") {
      phan.push(labelFor(BUOI_OPTIONS, don.buoi));
    }
  } else if (don.loaiDon === "nghi_phep" || don.loaiDon === "nghi_bu") {
    if (don.buoi && don.buoi !== "ca_ngay") {
      phan.push(labelFor(BUOI_OPTIONS, don.buoi));
    }
    if (don.loaiNghi) phan.push(labelFor(LOAI_NGHI_OPTIONS, don.loaiNghi));
    if (don.soNgayNghi !== undefined) phan.push(`${don.soNgayNghi} ngày nghỉ`);
  } else {
    if (don.gioTu && don.gioDen) phan.push(`${don.gioTu} – ${don.gioDen}`);
    if (don.soGioOt !== undefined) phan.push(`${don.soGioOt} giờ OT`);
    if (don.heSoOt !== undefined) phan.push(`hệ số ${don.heSoOt}`);
  }

  return phan.join(" · ");
}
