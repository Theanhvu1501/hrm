/**
 * Mức lương khai báo BHXH thực sự áp cho một nhân viên.
 *
 * Tồn tại vì `emp.mucKhaiBao ?? mặc định` là SAI: `??` chỉ rơi về mặc định
 * khi `null`/`undefined`, nên số `0` bị hiểu là "đã khai mức 0". Đo trên
 * production tháng 07/2026: NV0004 có `dongBH = true` nhưng hồ sơ lưu
 * `mucKhaiBao = 0` ⇒ `baseBHXH = 0` ⇒ BHXH = 10,5% × 0 = 0. Người lao động
 * không bị trừ BHXH, và vì BHXH là khoản trừ TRƯỚC thuế nên TNCN của anh ấy
 * cũng bị tính thừa — anh ấy là người duy nhất trong công ty có thuế ≠ 0.
 *
 * Không có mức đóng BHXH hợp lệ nào bằng 0 hay âm: "không đóng" đã có cờ
 * `dongBH` riêng. Nên `<= 0` = chưa khai.
 *
 * Hàm THUẦN và dùng CHUNG cho cả đường tổng hợp lẫn đường tính lại — hai nơi
 * đó normalize khác nhau là bảng lương đổi số giữa hai lần chạy.
 */
export function mucKhaiBaoApDung(
  cuaNhanVien: number | null | undefined,
  macDinhCongTy: number,
): number {
  if (typeof cuaNhanVien === 'number' && cuaNhanVien > 0) return cuaNhanVien;
  // `|| 0` chặn NaN/undefined của cấu hình hỏng: NaN đi hết đường tính rồi
  // hiện `thucLinh = NaN` trên phiếu lương của người thật.
  return typeof macDinhCongTy === 'number' && macDinhCongTy > 0
    ? macDinhCongTy
    : 0;
}
