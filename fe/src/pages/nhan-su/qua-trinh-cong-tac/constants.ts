export const LOAI_THAY_DOI_OPTIONS = [
  { value: "dieu_chuyen", label: "Điều chuyển" },
  { value: "tang_luong", label: "Tăng lương" },
  { value: "bo_nhiem", label: "Bổ nhiệm" },
  { value: "doi_trang_thai", label: "Đổi trạng thái" },
  { value: "danh_gia", label: "Đánh giá" },
] as const;

export const TRANG_THAI_MOI_OPTIONS = [
  { value: "dang_lam_viec", label: "Đang làm việc" },
  { value: "tam_nghi", label: "Tạm nghỉ" },
  { value: "da_nghi", label: "Đã nghỉ" },
] as const;

export const LOAI_THAY_DOI_TAG_COLOR: Record<string, string> = {
  dieu_chuyen: "blue",
  tang_luong: "green",
  bo_nhiem: "gold",
  doi_trang_thai: "purple",
  danh_gia: "cyan",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
