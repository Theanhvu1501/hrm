export type ChiTietLoai =
  | 'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU' | 'NGAN_HANG_QUY';

export const CHI_TIET_LABEL: Record<ChiTietLoai, string> = {
  KHACH_HANG: 'Khách hàng',
  NHA_CUNG_CAP: 'Nhà cung cấp',
  NHAN_VIEN: 'Nhân viên',
  NHA_THAU: 'Nhà thầu',
  NGAN_HANG_QUY: 'Ngân hàng & Quỹ',
};

// 4 loai map sang DoiTuong.loai; NGAN_HANG_QUY dung danh muc NganHang
export const DOI_TUONG_LOAI: Record<ChiTietLoai, string | null> = {
  KHACH_HANG: 'KHACH_HANG',
  NHA_CUNG_CAP: 'NHA_CUNG_CAP',
  NHAN_VIEN: 'NHAN_VIEN',
  NHA_THAU: 'NHA_THAU',
  NGAN_HANG_QUY: null,
};

export interface SoDuRow {
  key: string;
  maTaiKhoan: string;
  tenTaiKhoan: string;
  chiTietTheo?: ChiTietLoai;
  chiTietId?: string;
  chiTietMa?: string;
  chiTietTen?: string;
  nganHang?: string;
  duNo: number;
  duCo: number;
}

export interface ValidateResult {
  ok: boolean;
  message?: string;
}

export function validateRows(rows: SoDuRow[]): ValidateResult {
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.maTaiKhoan) {
      return { ok: false, message: 'Có dòng chưa chọn tài khoản' };
    }
    if (r.chiTietTheo && !r.chiTietId) {
      return {
        ok: false,
        message: `Tài khoản ${r.maTaiKhoan} cần chọn đối tượng (${CHI_TIET_LABEL[r.chiTietTheo]})`,
      };
    }
    const dupKey = `${r.maTaiKhoan}::${r.chiTietId ?? ''}::${r.nganHang ?? ''}`;
    if (seen.has(dupKey)) {
      return {
        ok: false,
        message: `Trùng dòng cho tài khoản ${r.maTaiKhoan}${r.chiTietMa ? ' - ' + r.chiTietMa : ''}`,
      };
    }
    seen.add(dupKey);
  }
  return { ok: true };
}
