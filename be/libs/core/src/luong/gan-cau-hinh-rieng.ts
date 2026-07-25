import type { CauHinhLuongData, CauHinhLuongRieng } from '@app/entities';

/** Số dương hữu hạn, ngược lại `undefined` để caller rơi về mặc định. */
function soDuong(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
}

/** Tỷ lệ trong [0,1]. `0` là giá trị HỢP LỆ (thử việc 0%, BH 0%). */
function tyLe(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
    ? v
    : undefined;
}

function canCu(v: unknown): CauHinhLuongData['bhxh']['canCu'] | undefined {
  return v === 'MUC_KHAI_BAO' || v === 'LUONG_THOA_THUAN' ? v : undefined;
}

/**
 * Gộp cấu hình lương RIÊNG của một NV lên cấu hình chung của công ty, chạy
 * TRƯỚC `tinhDongLuong`. Nhờ tách ra đây, engine giữ nguyên chữ ký và vẫn
 * thuần — nó không cần biết gì về `Employee`.
 *
 * Trả về BẢN SAO, không mutate `ch`: cùng một `ch` được gộp lại cho từng NV
 * trong một vòng lặp tổng hợp kỳ, mutate là làm hỏng những NV sau.
 *
 * Giá trị override vô lý (công chuẩn ≤ 0, tỷ lệ ngoài [0,1], căn cứ lạ) bị
 * BỎ QUA và rơi về cấu hình chung — chọn "tính bằng số của công ty" thay vì
 * ném lỗi giữa lúc chạy kỳ lương cho toàn bộ nhân sự.
 */
export function ganCauHinhRieng(
  ch: CauHinhLuongData,
  ov?: CauHinhLuongRieng,
): CauHinhLuongData {
  const o = ov ?? {};
  return {
    ...ch,
    congChuan: soDuong(o.congChuan) ?? ch.congChuan,
    thuViec: { ...ch.thuViec, tyLe: tyLe(o.thuViecTyLe) ?? ch.thuViec.tyLe },
    bhxh: {
      ...ch.bhxh,
      tyLe: tyLe(o.bhxhTyLe) ?? ch.bhxh.tyLe,
      canCu: canCu(o.bhxhCanCu) ?? ch.bhxh.canCu,
    },
  };
}
