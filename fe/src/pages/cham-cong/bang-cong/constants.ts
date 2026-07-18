export const TRANG_THAI_OPTIONS = [
  { value: "nhap", label: "Nháp" },
  { value: "chot", label: "Đã chốt" },
] as const;

export const TRANG_THAI_TAG_COLOR: Record<string, string> = {
  nhap: "gold",
  chot: "green",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
