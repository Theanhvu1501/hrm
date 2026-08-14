export const LOAI_DON_OPTIONS = [
  { value: "giai_trinh", label: "Giải trình" },
  { value: "lam_them_gio", label: "Làm thêm giờ" },
  { value: "nghi_phep", label: "Nghỉ phép" },
  { value: "nghi_bu", label: "Nghỉ bù" },
  { value: "lam_online", label: "Làm online" },
] as const;

// Chỉ dùng khi loaiDon là nghi_phep/nghi_bu — khớp @IsIn của trường loaiNghi
// ở be/apps/config-service/src/don-cham-cong/dto/create-don-cham-cong.dto.ts.
export const LOAI_NGHI_OPTIONS = [
  { value: "phep_nam", label: "Phép năm" },
  { value: "khong_luong", label: "Không lương" },
  { value: "om_dau", label: "Ốm đau" },
  { value: "thai_san", label: "Thai sản" },
  { value: "cuoi_hoi", label: "Cưới hỏi" },
  { value: "tang", label: "Tang" },
] as const;

// Chỉ có ý nghĩa khi đơn nghỉ phép đúng một ngày (ngay = denNgay) — khớp
// @IsIn của trường buoi ở cùng DTO trên. "ca_ngay" đứng trước vì đó là lựa
// chọn mặc định phổ biến nhất (nghỉ trọn ngày).
export const BUOI_OPTIONS = [
  { value: "ca_ngay", label: "Cả ngày" },
  { value: "sang", label: "Buổi sáng" },
  { value: "chieu", label: "Buổi chiều" },
] as const;

// Chỉ dùng khi loaiDon là nghi_bu — khớp @IsIn của trường kieuNghi ở
// be/apps/config-service/src/don-cham-cong/dto/create-don-cham-cong.dto.ts.
// "theo_ngay" đứng trước: đó là hành vi trước P4.2a và là lựa chọn mặc định
// (xem truongTheoLoaiDon.truongCuaDon()).
export const KIEU_NGHI_BU_OPTIONS = [
  { value: "theo_ngay", label: "Nghỉ cả ngày" },
  { value: "theo_gio", label: "Nghỉ theo giờ" },
] as const;

export const TRANG_THAI_OPTIONS = [
  { value: "cho_duyet", label: "Chờ duyệt" },
  { value: "da_duyet", label: "Đã duyệt" },
  { value: "tu_choi", label: "Từ chối" },
] as const;

export const TRANG_THAI_TAG_COLOR: Record<string, string> = {
  cho_duyet: "gold",
  da_duyet: "green",
  tu_choi: "red",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
