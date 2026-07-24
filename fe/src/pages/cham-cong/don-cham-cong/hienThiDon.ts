import { AttendanceRequest } from "@/services/attendanceRequestService";
import { hienTruong } from "./truongTheoLoaiDon";

/**
 * Ba ô văn bản của bảng đơn HR (`/cham-cong/don-tu`) mà người duyệt đọc
 * TRƯỚC KHI bấm Duyệt.
 *
 * Tách khỏi component để test được bằng bảng: `soLieuDon` phải phân biệt được
 * "backend tính ra 0" với "backend chưa tính" — đúng chỗ mà `||` đã làm hỏng
 * ba lần trong dự án này.
 */

/** Cột "Ngày": một ngày thì một ngày, đơn nghỉ nhiều ngày thì cả hai đầu. */
export function khoangNgay(don: AttendanceRequest): string {
  if (!don.ngay) return "-";
  // denNgay === ngay KHÔNG hiện thành khoảng: "2026-08-03 → 2026-08-03" đọc
  // như lỗi hiển thị, mà đơn nghỉ một ngày là trường hợp phổ biến nhất
  // (dungDtoQuanTri luôn gửi denNgay = ngay cho đơn nghỉ một ngày).
  if (!don.denNgay || don.denNgay === don.ngay) return don.ngay;
  return `${don.ngay} → ${don.denNgay}`;
}

/**
 * Cột "Giờ": khung giờ của các loại đơn CÓ trường giờ (giải trình và làm thêm
 * giờ, theo bảng luật dùng chung).
 *
 * Hỏi `hienTruong` chứ không so `loaiDon === "lam_them_gio"` như bản cũ: đơn
 * giải trình cũng có giờ (bảng §7 của spec), và cột cũ giấu mất nó — HR duyệt
 * một đơn giải trình mà không thấy nó giải trình cho khung giờ nào.
 */
export function khungGio(don: AttendanceRequest): string {
  if (!hienTruong(don, "gioTu")) return "-";
  if (!don.gioTu && !don.gioDen) return "-";
  return `${don.gioTu || "?"}–${don.gioDen || "?"}`;
}

/**
 * Cột "Số liệu": số ngày nghỉ (đơn nghỉ) hoặc số giờ OT × hệ số (đơn OT) —
 * đều là snapshot BACKEND TỰ TÍNH lúc tạo đơn (luat-don.ts), FE chỉ hiển thị.
 *
 * Dùng `!== undefined` chứ KHÔNG `if (don.soGioOt)`: 0 là giá trị THẬT
 * (khoảng nghỉ rơi hết vào ngày lễ → 0 ngày nghỉ; đơn OT khai giờ từ = giờ
 * đến → 0 giờ). HR cần thấy đúng con số 0 để biết đơn này không cộng gì cả,
 * thay vì thấy "-" rồi tưởng hệ thống chưa tính xong và cứ thế duyệt.
 */
export function soLieuDon(don: AttendanceRequest): string {
  if (don.loaiDon === "nghi_phep" || don.loaiDon === "nghi_bu") {
    if (don.soNgayNghi === undefined) return "-";
    return `${don.soNgayNghi} ngày nghỉ`;
  }

  if (don.loaiDon === "lam_them_gio") {
    if (don.soGioOt === undefined) return "-";
    const heSo = don.heSoOt === undefined ? "" : ` × ${don.heSoOt}`;
    return `${don.soGioOt} giờ${heSo}`;
  }

  return "-";
}
