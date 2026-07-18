export const LOAI_THOI_VIEC_OPTIONS = [
  { value: "tu_nguyen", label: "Tự nguyện" },
  { value: "ky_luat", label: "Kỷ luật" },
  { value: "het_han_hd", label: "Hết hạn hợp đồng" },
  { value: "khac", label: "Khác" },
] as const;

export const TRANG_THAI_OPTIONS = [
  { value: "cho_duyet", label: "Chờ duyệt" },
  { value: "da_duyet", label: "Đã duyệt" },
  { value: "hoan_thanh", label: "Hoàn thành" },
  { value: "tu_choi", label: "Từ chối" },
] as const;

export const TRANG_THAI_TAG_COLOR: Record<string, string> = {
  cho_duyet: "default",
  da_duyet: "blue",
  hoan_thanh: "green",
  tu_choi: "red",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
