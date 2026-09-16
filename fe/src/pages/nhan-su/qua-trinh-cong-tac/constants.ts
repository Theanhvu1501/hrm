/**
 * Loại thay đổi CHỌN ĐƯỢC khi ghi nhận mới (yêu cầu d13).
 *
 * Đã bỏ khỏi danh sách chọn:
 *   - "Đổi trạng thái": trùng việc với màn Thôi việc, hai nơi cùng sửa một
 *     trạng thái thì không ai biết bên nào đúng.
 *   - "Đánh giá": không định nghĩa được nó ghi nhận cái gì (câu hỏi của chính
 *     người dùng trong bảng yêu cầu).
 * Hai giá trị đó vẫn có NHÃN ở `LOAI_THAY_DOI_LABEL` để bản ghi cũ hiện đúng.
 */
export const LOAI_THAY_DOI_OPTIONS = [
  { value: "dieu_chuyen", label: "Điều chuyển" },
  { value: "tang_luong", label: "Tăng lương / điều chỉnh lương" },
  { value: "bo_nhiem", label: "Bổ nhiệm" },
  { value: "khac", label: "Thay đổi khác" },
] as const;

/** Nhãn của MỌI loại, gồm cả loại không còn chọn mới và loại do hệ thống sinh. */
export const LOAI_THAY_DOI_LABEL: Record<string, string> = {
  dieu_chuyen: "Điều chuyển",
  tang_luong: "Tăng lương / điều chỉnh lương",
  bo_nhiem: "Bổ nhiệm",
  khac: "Thay đổi khác",
  thoi_viec: "Thôi việc",
  doi_trang_thai: "Đổi trạng thái",
  danh_gia: "Đánh giá",
};

export const TRANG_THAI_MOI_OPTIONS = [
  { value: "dang_lam_viec", label: "Đang làm việc" },
  { value: "tam_nghi", label: "Tạm nghỉ" },
  { value: "da_nghi", label: "Đã nghỉ" },
] as const;

export const LOAI_THAY_DOI_TAG_COLOR: Record<string, string> = {
  dieu_chuyen: "blue",
  tang_luong: "green",
  bo_nhiem: "gold",
  khac: "default",
  thoi_viec: "red",
  doi_trang_thai: "purple",
  danh_gia: "cyan",
};

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value?: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "-");
}
