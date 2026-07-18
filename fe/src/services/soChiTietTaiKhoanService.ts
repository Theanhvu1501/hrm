import { ServiceBase } from './base/service-base';

export interface SoChiTietRow {
  ngay: string;
  soPhieu: string;
  ngayChungTu: string;
  noiDung: string;
  tkDoiUng: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
  maDoiTuong?: string;
  tenDoiTuong?: string;
  maDoiTuong2?: string;
  tenDoiTuong2?: string;
  maKhoanMuc?: string;
  tenKhoanMuc?: string;
  maDuAn?: string;
  tenDuAn?: string;
  maBoPhan?: string;
  tenBoPhan?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  maDoi?: string;
  tenDoi?: string;
  maSanPham?: string;
  tenSanPham?: string;
  maDongTien?: string;
  tenDongTien?: string;
  maLoaiGiaoDich?: string;
  tenLoaiGiaoDich?: string;
  maNghiepVu?: string;
  tenNghiepVu?: string;
}

export interface SoChiTietReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  doiTuong?: { ma: string; ten: string };
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  rows: SoChiTietRow[];
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
}

class SoChiTietTaiKhoanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/so-chi-tiet-tai-khoan' });
  }

  async getReport(
    maTaiKhoans: string[] | 'all',
    startDate: Date,
    endDate: Date,
    maDoiTuong?: string,
  ): Promise<SoChiTietReport[]> {
    const params: Record<string, string> = {
      maTaiKhoan: maTaiKhoans === 'all' ? 'all' : maTaiKhoans.join(','),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
    if (maDoiTuong) params.maDoiTuong = maDoiTuong;

    const data = await this.get<{ reports: SoChiTietReport[] }>({ params });
    return data?.reports ?? [];
  }
}

export const soChiTietTaiKhoanService = new SoChiTietTaiKhoanService();
