export interface CongNoCell {
  phaiThu: number;
  phaiTra: number;
}

export interface CongNoRowVal {
  dauKy: CongNoCell;
  phatSinh: CongNoCell;
  cuoiKy: CongNoCell;
}

export interface CongNoDoiTuongRow extends CongNoRowVal {
  ma: string;
  ten: string;
}

export interface CongNoAccount extends CongNoRowVal {
  ma: string;
  ten: string;
  doiTuongs: CongNoDoiTuongRow[];
}

export interface BangTongHopCongNo {
  accounts: CongNoAccount[];
  totals: CongNoRowVal;
}

/** Loại "chi tiết theo" được coi là công nợ (loại trừ NGAN_HANG_QUY). */
export const CONG_NO_CHI_TIET_TYPES = new Set([
  'KHACH_HANG',
  'NHA_CUNG_CAP',
  'NHA_THAU',
  'NHAN_VIEN',
]);

export interface AccountInfo {
  ma: string;
  ten: string;
  loai: string;
  chiTietTheo?: string;
}

export interface DtAggInput {
  ma: string;
  doiTuongMa: string | null;
  doiTuongTen: string | null;
  doiTuongLoai: string | null;
  priorNo: number;
  priorCo: number;
  periodNo: number;
  periodCo: number;
}

export interface DtOpeningInput {
  maTaiKhoan: string;
  chiTietMa: string | null;
  chiTietTen: string | null;
  chiTietType: string | null;
  duNo: number;
  duCo: number;
}

export interface CongNoFilters {
  maTaiKhoan?: string;
  maDoiTuong?: string;
}
