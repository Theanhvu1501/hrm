/**
 * Lấy mã từ giá trị dropdown dạng "Mã - Tên".
 * Nếu không chứa " - " (dấu gạch có khoảng trắng hai bên) → trả nguyên chuỗi đã trim.
 * Hỗ trợ cả file chọn dropdown ("111 - Tiền mặt") lẫn file gõ mã thuần ("111").
 */
export function extractCode(value: string | undefined | null): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (s === "") return "";
  const idx = s.indexOf(" - ");
  return idx === -1 ? s : s.slice(0, idx).trim();
}
