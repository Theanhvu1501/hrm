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

// Nhãn thứ trong tuần theo dayjs().day(): 0 = Chủ nhật ... 6 = Thứ bảy.
export const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function isWeekendDay(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6;
}
