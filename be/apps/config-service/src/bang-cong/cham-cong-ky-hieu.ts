export interface KyHieuDef {
  kyHieu: string;
  nhan: string;
  soCong: number;
  nhom: 'lam_viec' | 'nghi_huong_luong' | 'nghi_khong_luong' | 'om_bhxh';
}

export const KY_HIEU_CHAM_CONG: KyHieuDef[] = [
  { kyHieu: 'X', nhan: 'Làm đủ ngày', soCong: 1, nhom: 'lam_viec' },
  { kyHieu: '1/2', nhan: 'Làm nửa ngày', soCong: 0.5, nhom: 'lam_viec' },
  { kyHieu: 'P', nhan: 'Nghỉ phép', soCong: 1, nhom: 'nghi_huong_luong' },
  { kyHieu: 'L', nhan: 'Nghỉ lễ/Tết', soCong: 1, nhom: 'nghi_huong_luong' },
  { kyHieu: 'NB', nhan: 'Nghỉ bù', soCong: 1, nhom: 'nghi_huong_luong' },
  { kyHieu: 'CT', nhan: 'Công tác', soCong: 1, nhom: 'lam_viec' },
  { kyHieu: 'O', nhan: 'Nghỉ ốm (BHXH)', soCong: 0, nhom: 'om_bhxh' },
  {
    kyHieu: 'KL',
    nhan: 'Nghỉ không lương',
    soCong: 0,
    nhom: 'nghi_khong_luong',
  },
];

export function soCongCuaKyHieu(k?: string): number {
  const d = KY_HIEU_CHAM_CONG.find((x) => x.kyHieu === k);
  return d ? d.soCong : 0;
}

/**
 * Nguồn của một ô bảng công.
 *
 * `tu_dong` = máy suy ra, lần tổng hợp sau được phép tính lại và ghi đè.
 * `hr_sua`  = người đã chạm vào, máy KHÔNG bao giờ được đụng nữa.
 */
export const NGUON_O = {
  TU_DONG: 'tu_dong',
  HR_SUA: 'hr_sua',
} as const;

/**
 * Ô thiếu `nguon` là dữ liệu có TRƯỚC khi có tự sinh — toàn bộ đều do HR tick
 * tay. Mặc định phải là `hr_sua`: hiểu ngược lại thì lần tổng hợp đầu tiên sau
 * khi deploy sẽ xoá sạch công sức nhập liệu của nhiều tháng đã chốt.
 */
export function nguonCuaO(o: { nguon?: string }): string {
  return o.nguon === NGUON_O.TU_DONG ? NGUON_O.TU_DONG : NGUON_O.HR_SUA;
}
