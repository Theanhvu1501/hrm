/**
 * Nhãn/màu trạng thái thiết bị chấm công, tách riêng khỏi component để test
 * không cần render React — cùng khuôn với
 * `fe/src/pages/cham-cong/don-cham-cong/constants.ts`.
 *
 * 4 trạng thái phải khớp `TRANG_THAI_THIET_BI` ở
 * `be/apps/config-service/src/thiet-bi-cham-cong/thiet-bi-cham-cong.service.ts`.
 */

/** Nhãn cho cột "Trạng thái" trong bảng — mô tả trạng thái hiện tại của dòng. */
export const TRANG_THAI_OPTIONS = [
  { value: "cho_duyet", label: "Chờ duyệt" },
  { value: "da_duyet", label: "Đã duyệt" },
  { value: "tu_choi", label: "Đã từ chối" },
  { value: "thu_hoi", label: "Đã thu hồi" },
] as const;

export const TRANG_THAI_TAG_COLOR: Record<string, string> = {
  cho_duyet: "gold",
  da_duyet: "green",
  tu_choi: "red",
  thu_hoi: "default",
};

/**
 * Nhãn cho các Tab điều hướng — CỐ Ý khác nhãn cột "Trạng thái" cho `da_duyet`
 * ("Đang dùng" thay vì lặp lại "Đã duyệt"): đây là hàng đợi công việc HR cần
 * xử lý, tab nói theo góc nhìn "việc đang ở đâu", không phải bản sao của cột
 * trạng thái.
 */
export const TAB_OPTIONS = [
  { value: "cho_duyet", label: "Chờ duyệt" },
  { value: "da_duyet", label: "Đang dùng" },
  { value: "thu_hoi", label: "Đã thu hồi" },
  { value: "tu_choi", label: "Đã từ chối" },
] as const;

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
