import type { PillTone } from "@/components/ui/StatusPill";

export const LOAI_HOP_DONG_OPTIONS = [
  { value: "thu_viec", label: "Thử việc" },
  { value: "xac_dinh_thoi_han", label: "Xác định thời hạn" },
  { value: "khong_xac_dinh_thoi_han", label: "Không xác định thời hạn" },
  { value: "dich_vu", label: "Dịch vụ" },
] as const;

export const TRANG_THAI_OPTIONS = [
  { value: "du_thao", label: "Dự thảo" },
  { value: "dang_hieu_luc", label: "Đang hiệu lực" },
  { value: "het_han", label: "Hết hạn" },
  { value: "da_thanh_ly", label: "Đã thanh lý" },
] as const;

export const HINH_THUC_TRA_LUONG_OPTIONS = [
  { value: "gross", label: "Gross" },
  { value: "net", label: "Net" },
] as const;

export const TRANG_THAI_TONE: Record<string, PillTone> = {
  du_thao: "nhap",
  dang_hieu_luc: "ok",
  het_han: "cho",
  da_thanh_ly: "trung-tinh",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
