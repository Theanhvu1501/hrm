export const LOAI_DON_OPTIONS = [
  { value: "giai_trinh", label: "Giải trình" },
  { value: "lam_them_gio", label: "Làm thêm giờ" },
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
