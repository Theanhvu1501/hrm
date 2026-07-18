export const LOAI_HOP_DONG_OPTIONS = [
  { value: "thu_viec", label: "Thử việc" },
  { value: "chinh_thuc", label: "Chính thức" },
  { value: "dich_vu", label: "Dịch vụ" },
] as const;

export const TRANG_THAI_OPTIONS = [
  { value: "dang_lam_viec", label: "Đang làm việc" },
  { value: "da_nghi", label: "Đã nghỉ" },
  { value: "tam_nghi", label: "Tạm nghỉ" },
] as const;

export const GIOI_TINH_OPTIONS = [
  { value: "nam", label: "Nam" },
  { value: "nu", label: "Nữ" },
  { value: "khac", label: "Khác" },
] as const;

export const TRANG_THAI_TAG_COLOR: Record<string, string> = {
  dang_lam_viec: "green",
  da_nghi: "red",
  tam_nghi: "orange",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
