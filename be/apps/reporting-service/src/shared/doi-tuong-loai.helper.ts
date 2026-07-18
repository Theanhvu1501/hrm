/**
 * Khớp loại đối tượng với "Chi tiết theo" của tài khoản.
 *
 * Đối tượng trong danh mục có thể ĐA LOẠI (`loai: string[]`, vd vừa KHACH_HANG
 * vừa NHA_CUNG_CAP), nhưng snapshot lưu trong chứng từ / số dư đầu kỳ chỉ giữ
 * MỘT loại (loại chính = loai[0]). Vì vậy KHÔNG so sánh trực tiếp
 * snapshot.loai === chiTietTheo: đối tượng đa loại có loai[0]='KHACH_HANG' sẽ
 * bị loại khỏi TK 331 (chiTietTheo='NHA_CUNG_CAP') và rơi vào "Chưa xác định
 * đối tượng" dù chứng từ đã gắn đối tượng.
 *
 * Nguồn chân lý là `loai` của danh mục đối tượng; snapshot chỉ dùng để dự phòng
 * khi không tra được danh mục.
 */
export type LoaiMatcher = (
  ma: string | null | undefined,
  snapshotLoai: string | null | undefined,
  expectedLoai: string,
) => boolean;

/**
 * Dự phòng: chỉ tin snapshot (dùng khi caller không truyền danh mục đối tượng).
 * Giữ nguyên hành vi cũ.
 */
export const matchLoaiBySnapshot: LoaiMatcher = (ma, snapshotLoai, expectedLoai) =>
  !!ma && snapshotLoai === expectedLoai;

/** Index mã đối tượng → tập loại (danh mục đối tượng, `loai` là mảng). */
export function buildDoiTuongLoaiIndex(
  doiTuongs: Array<{ ma?: string; loai?: string | string[] | null }>,
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const dt of doiTuongs) {
    if (!dt?.ma) continue;
    const loais = Array.isArray(dt.loai) ? dt.loai : dt.loai ? [dt.loai] : [];
    const set = index.get(dt.ma) ?? new Set<string>();
    for (const l of loais) if (l) set.add(l);
    index.set(dt.ma, set);
  }
  return index;
}

/**
 * Matcher tra danh mục: đối tượng hợp lệ với TK khi danh mục của nó CHỨA loại
 * mà TK yêu cầu (đa loại → khớp nhiều TK).
 * - NGAN_HANG_QUY: đối tượng đến từ danh mục Ngân hàng & Quỹ, không nằm trong
 *   danh mục đối tượng → chỉ tin snapshot.
 * - Không tra được (đối tượng đã xoá khỏi danh mục) → dự phòng theo snapshot.
 */
export function makeLoaiMatcher(index: Map<string, Set<string>>): LoaiMatcher {
  return (ma, snapshotLoai, expectedLoai) => {
    if (!ma) return false;
    if (expectedLoai === 'NGAN_HANG_QUY' || snapshotLoai === 'NGAN_HANG_QUY') {
      return snapshotLoai === expectedLoai;
    }
    const loais = index.get(ma);
    if (loais && loais.size > 0) return loais.has(expectedLoai);
    return snapshotLoai === expectedLoai;
  };
}
