export const CACH_XUAT_VALUES = ['DINH_LUONG', 'THEO_SUAT', 'DON_VI'] as const;
export type CachXuat = (typeof CACH_XUAT_VALUES)[number];

/** DINH_LUONG (khối lượng/suất) và THEO_SUAT (đơn vị/trẻ) đều xuất theo công thức; DON_VI thì không. */
export function isTieuHaoTheoCongThuc(v: CachXuat): boolean {
  return v === 'DINH_LUONG' || v === 'THEO_SUAT';
}
