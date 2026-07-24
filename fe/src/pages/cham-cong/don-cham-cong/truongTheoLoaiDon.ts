import { AttendanceRequestType } from "@/services/attendanceRequestService";

/**
 * NGUỒN SỰ THẬT DUY NHẤT của luật "loại đơn nào có những trường nào".
 *
 * Đặt ở `cham-cong/don-cham-cong/` (cạnh `constants.ts`) chứ không nằm trong
 * một trong hai màn dùng nó, vì có ĐÚNG HAI form nộp đơn và chúng phải theo
 * cùng một luật:
 *
 *  - `/toi/don-tu` (nhân viên tự nộp)  → `toi/don-tu/truongDon.ts`
 *  - `/cham-cong/don-tu` (HR nộp hộ)   → `components/form/donChamCongForm.convert.ts`
 *
 * Hai bảng luật song song sẽ lệch nhau ngay lần sửa đầu tiên: thêm một loại
 * đơn ở màn này, quên màn kia, và HR nộp ra một cái đơn thiếu trường mà
 * backend vẫn nhận (các trường đều `@IsOptional`) — sai chỉ lộ ra ở bảng
 * lương cuối tháng.
 */
export type TruongDon =
  | "ngay"
  | "denNgay"
  | "buoi"
  | "loaiNghi"
  | "lyDo"
  | "gioTu"
  | "gioDen";

/**
 * Bảng §7 của docs/superpowers/specs/2026-07-24-hrm-p3.6-don-tu-design.md.
 *
 * `buoi` có mặt ở đây cho nghi_phep/nghi_bu nhưng CHỈ hiện khi đơn đúng một
 * ngày — xem `hienBuoi()`. Nửa buổi của một khoảng 3 ngày là vô nghĩa, và
 * `tinhSoNgayNghi()` ở backend cũng chỉ đọc `buoi` khi tuNgay === denNgay.
 */
export const TRUONG_THEO_LOAI: Record<
  AttendanceRequestType,
  readonly TruongDon[]
> = {
  giai_trinh: ["ngay", "gioTu", "gioDen", "lyDo"],
  lam_them_gio: ["ngay", "gioTu", "gioDen", "lyDo"],
  nghi_phep: ["ngay", "denNgay", "buoi", "loaiNghi", "lyDo"],
  nghi_bu: ["ngay", "denNgay", "buoi", "lyDo"],
};

/**
 * Phần TỐI THIỂU của một form đơn mà luật hiển thị cần đọc.
 *
 * Cố ý hẹp như vậy để cả hai form dùng chung được: form nhân viên
 * (`GiaTriFormDon`) và form HR (`DonChamCongFormValues`, có thêm employeeId /
 * minhChung / ghiChu) đều khớp cấu trúc này mà không phải ép kiểu.
 */
export interface DonDangSoan {
  loaiDon: AttendanceRequestType;
  ngay: string;
  denNgay?: string;
}

/** Đơn nghỉ đúng MỘT ngày mới có khái niệm nửa buổi. */
export function hienBuoi(v: DonDangSoan): boolean {
  if (v.loaiDon !== "nghi_phep" && v.loaiDon !== "nghi_bu") return false;
  // denNgay rỗng nghĩa là người dùng chưa chọn ngày kết thúc → coi như đúng
  // một ngày (đó cũng là cách form gửi lên: denNgay = ngay).
  return !v.denNgay || v.denNgay === v.ngay;
}

/** Trường nào được vẽ ra cho loại đơn đang chọn. */
export function hienTruong(v: DonDangSoan, truong: TruongDon): boolean {
  if (!TRUONG_THEO_LOAI[v.loaiDon].includes(truong)) return false;
  if (truong === "buoi") return hienBuoi(v);
  return true;
}
