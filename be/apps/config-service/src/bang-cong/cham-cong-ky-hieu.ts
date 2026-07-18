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
