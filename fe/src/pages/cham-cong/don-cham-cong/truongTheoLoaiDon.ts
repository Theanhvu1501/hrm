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
  /** Chỉ đọc khi loaiDon === "nghi_bu" — xem truongCuaDon(). */
  kieuNghi?: string;
}

/** Đơn nghỉ đúng MỘT ngày mới có khái niệm nửa buổi. */
export function hienBuoi(v: DonDangSoan): boolean {
  if (v.loaiDon !== "nghi_phep" && v.loaiDon !== "nghi_bu") return false;
  // denNgay rỗng nghĩa là người dùng chưa chọn ngày kết thúc → coi như đúng
  // một ngày (đó cũng là cách form gửi lên: denNgay = ngay).
  return !v.denNgay || v.denNgay === v.ngay;
}

/**
 * Trường hiển thị của một đơn. Với `nghi_bu`, hình dạng phụ thuộc `kieuNghi`
 * — KHAI TƯỜNG MINH bởi một control riêng (KIEU_NGHI_BU_OPTIONS), không suy
 * từ việc `gioTu` có rỗng hay không (đó là cách hai lỗi sản xuất trước đây
 * trong repo này xảy ra — xem docblock CreateAttendanceRequestDto).
 *
 * Thiếu `kieuNghi` mặc định `theo_ngay`: đó là hành vi trước P4.2a, và đơn cũ
 * nạp vào form sửa không mang trường này.
 *
 * Ba loại đơn còn lại (`giai_trinh`/`lam_them_gio`/`nghi_phep`) tra thẳng
 * `TRUONG_THEO_LOAI` — bảng đó vẫn là nguồn sự thật cho chúng.
 */
export function truongCuaDon(v: DonDangSoan): readonly TruongDon[] {
  if (v.loaiDon === "nghi_bu") {
    return v.kieuNghi === "theo_gio"
      ? (["ngay", "gioTu", "gioDen", "lyDo"] as const)
      : (["ngay", "denNgay", "buoi", "lyDo"] as const);
  }
  return TRUONG_THEO_LOAI[v.loaiDon] ?? [];
}

/** Trường nào được vẽ ra cho loại đơn đang chọn. */
export function hienTruong(v: DonDangSoan, truong: TruongDon): boolean {
  if (!truongCuaDon(v).includes(truong)) return false;
  if (truong === "buoi") return hienBuoi(v);
  return true;
}
