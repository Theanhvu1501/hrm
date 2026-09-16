import type { PillTone } from "@/components/ui/StatusPill";

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

/**
 * Hai cơ quan cấp CCCD gắn chip (yêu cầu d4). Vẫn gõ tay được cho CMND cũ do
 * công an tỉnh cấp — xem AutoComplete ở CaNhanTab.
 */
export const NOI_CAP_CCCD_OPTIONS = [
  "Cục Cảnh sát QLHC về TTXH",
  "Bộ Công an",
] as const;

export const GIOI_TINH_OPTIONS = [
  { value: "nam", label: "Nam" },
  { value: "nu", label: "Nữ" },
  { value: "khac", label: "Khác" },
] as const;

export const TRANG_THAI_TONE: Record<string, PillTone> = {
  dang_lam_viec: "ok",
  da_nghi: "trung-tinh",
  tam_nghi: "cho",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
