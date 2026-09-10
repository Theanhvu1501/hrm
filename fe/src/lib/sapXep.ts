/**
 * Sắp xếp nhãn theo bảng chữ cái tiếng Việt — dùng cho MỌI select chọn danh mục
 * (đối tượng, hàng hóa, khoản mục, dòng tiền, dự án…).
 *
 * KHÔNG dùng cho select có thứ tự nghiệp vụ: Tài khoản (sắp theo mã), tháng /
 * quý / năm, trạng thái, loại chứng từ — ở đó thứ tự chính là thông tin.
 */

/** So sánh 2 nhãn: theo locale vi, bỏ qua hoa/thường, "Nhóm 2" đứng trước "Nhóm 10". */
export const soSanhNhan = (a?: string | null, b?: string | null): number =>
  (a ?? "").localeCompare(b ?? "", "vi", { sensitivity: "base", numeric: true });

type CoNhan = { label?: unknown; ten?: string | null };

/** Nhãn hiển thị của một option — `label` nếu là chuỗi, không thì `ten`. */
const nhanCua = (o: CoNhan): string => {
  if (typeof o?.label === "string") return o.label;
  if (typeof o?.label === "number") return String(o.label);
  return o?.ten ?? "";
};

/**
 * Trả về MẢNG MỚI đã sắp A-Z theo nhãn. Không sửa mảng gốc: nhiều chỗ dùng
 * chung một mảng cho cả bảng lẫn select, sort tại chỗ là đảo luôn thứ tự bảng.
 *
 * Option có `label` là ReactNode (Tag, icon…) thì rơi về `ten`; không có cả hai
 * thì coi như nhãn rỗng và bị đẩy lên đầu — chấp nhận được, thà lệch còn hơn nổ.
 */
export const sapXepTheoNhan = <T extends CoNhan>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => soSanhNhan(nhanCua(a), nhanCua(b)));

/** Sắp theo một trường bất kỳ, dùng khi option chưa dựng xong (vd danh mục thô). */
export const sapXepTheo = <T>(list: readonly T[], lay: (item: T) => string | undefined | null): T[] =>
  [...list].sort((a, b) => soSanhNhan(lay(a), lay(b)));
