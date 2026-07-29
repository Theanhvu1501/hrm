/**
 * Nguồn của một ô bảng công — bản mirror phía FE của
 * `nguonCuaO()` (be/apps/config-service/src/bang-cong/cham-cong-ky-hieu.ts).
 *
 * Quy ước tương thích ngược của BE: ô KHÔNG có `nguon` là dữ liệu có TRƯỚC
 * P3.9 — toàn bộ đều do HR tick tay, nên mặc định an toàn phải coi là
 * `hr_sua` (máy không bao giờ đè). FE PHẢI hỏi câu này giống hệt BE — nếu
 * không, hai tầng kể hai câu chuyện khác nhau về CÙNG một ô: BE không bao
 * giờ đè ô thiếu `nguon`, nhưng FE lại vẽ nó y như ô `tu_dong` (không viền,
 * không nút "Trả về tự động"), khiến HR không biết ô đó thật ra bất khả xâm
 * phạm.
 */
export const NGUON_O = {
  TU_DONG: "tu_dong",
  HR_SUA: "hr_sua",
} as const;

/**
 * Ô này có phải `hr_sua` không — dùng ở bất kỳ đâu FE cần hỏi câu này (viền
 * ô, nút "Trả về tự động", v.v.) để cả trang chỉ có MỘT định nghĩa.
 *
 * `!!kyHieu` là điều kiện cần: một ô THẬT SỰ RỖNG (chưa từng có ký hiệu) thì
 * không thuộc về ai cả, không được tính là `hr_sua` chỉ vì thiếu `nguon` —
 * khác với ô có ký hiệu nhưng thiếu `nguon` (dữ liệu cũ trước P3.9, phải coi
 * là `hr_sua` để bảo vệ công sức HR đã tick tay).
 */
export function laHrSua(o: { kyHieu?: string; nguon?: string }): boolean {
  return !!o.kyHieu && o.nguon !== NGUON_O.TU_DONG;
}
