import type { PillTone } from "@/components/ui/StatusPill";

export const TRANG_THAI_OPTIONS = [
  { value: "nhap", label: "Nháp" },
  { value: "chot", label: "Đã chốt" },
] as const;

export const TRANG_THAI_TONE: Record<string, PillTone> = {
  nhap: "nhap",
  chot: "ok",
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

// Màu đánh dấu ô trên lưới bảng công — DayCell vẽ, BangCongLegend chú giải.
// Khai MỘT chỗ để chú giải không thể lệch với ô thật trên lưới.
/** Viền xanh = HR đã sửa tay ô này, máy sẽ không tự ghi đè nữa. */
export const VIEN_O_HR_SUA = "1px solid hsl(var(--blue))";
/** Nền vàng = ô có cảnh báo, HR cần xem trước khi chốt. */
export const NEN_O_CANH_BAO = "hsl(var(--amber) / 0.14)";
/** Chữ thứ/ký hiệu của ngày cuối tuần. */
export const MAU_CUOI_TUAN = "hsl(var(--red))";
