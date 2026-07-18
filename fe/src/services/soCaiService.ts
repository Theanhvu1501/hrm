import { ServiceBase } from './base/service-base';

export interface SoCaiStats {
  tongPhatSinhNo: number;
  tongPhatSinhCo: number;
  soTaiKhoan: number;
  canDoi: boolean;
}

// Response from BE /summary-by-account
export interface AccountSummary {
  ma: string;
  ten: string;
  soDuDauKy: number;
  phatSinh: number;
  soDuCuoiKy: number;
}

// Mapped type for FE display
export interface SoCaiByAccount {
  taiKhoan: string;
  tenTaiKhoan: string;
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
  chiTiet: SoCaiEntry[];
}

export interface SoCaiEntry {
  ngay: string;
  soPhieu: string;
  loaiChungTu: string;
  dienGiai: string;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuNo: number;
  soDuCo: number;
}

// Response from BE /trial-balance
export interface TrialBalanceResponse {
  entries: TrialBalanceEntry[];
  totals: TrialBalanceEntry;
}

export interface TrialBalanceEntry {
  ma: string;
  ten: string;
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
  doiTuongChiTiet?: TrialBalanceEntry[];
  soTaiKhoan?: string;
  tenNganHang?: string;
  /** Tên tài khoản trong danh mục ngân hàng (chỉ có với đối tượng ngân hàng/quỹ). */
  tenTaiKhoanNH?: string;
}

// Mapped type for FE display
export interface TrialBalance {
  taiKhoan: string;
  tenTaiKhoan: string;
  soDuDauKyNo: number;
  soDuDauKyCo: number;
  phatSinhNo: number;
  phatSinhCo: number;
  soDuCuoiKyNo: number;
  soDuCuoiKyCo: number;
  doiTuongChiTiet?: TrialBalance[];
  soTaiKhoan?: string;
  tenNganHang?: string;
  tenTaiKhoanNH?: string;
}

class SoCaiService extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/so-cai' });
  }

  async getLedger(maTaiKhoan: string, startDate: Date, endDate: Date): Promise<SoCaiByAccount | null> {
    const data = await this.get<{
      taiKhoan: { ma: string; ten: string; loai: string };
      soDuDauKy: number;
      entries: Array<{ ngay: string; soPhieu: string; noiDung: string; no: number; co: number; soDu: number }>;
      tongNo: number;
      tongCo: number;
      soDuCuoiKy: number;
    }>({
      params: {
        maTaiKhoan,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    if (!data || !data.taiKhoan) return null;

    return {
      taiKhoan: data.taiKhoan.ma,
      tenTaiKhoan: data.taiKhoan.ten,
      soDuDauKyNo: data.taiKhoan.loai === 'NO' ? data.soDuDauKy : 0,
      soDuDauKyCo: data.taiKhoan.loai === 'CO' ? data.soDuDauKy : 0,
      phatSinhNo: data.tongNo,
      phatSinhCo: data.tongCo,
      soDuCuoiKyNo: data.taiKhoan.loai === 'NO' ? Math.max(0, data.soDuCuoiKy) : 0,
      soDuCuoiKyCo: data.taiKhoan.loai === 'CO' ? Math.max(0, data.soDuCuoiKy) : 0,
      chiTiet: data.entries.map((e) => ({
        ngay: new Date(e.ngay).toLocaleDateString('vi-VN'),
        soPhieu: e.soPhieu,
        loaiChungTu: e.no > 0 ? 'Phiếu chi' : 'Phiếu thu',
        dienGiai: e.noiDung,
        phatSinhNo: e.no,
        phatSinhCo: e.co,
        soDuNo: e.soDu > 0 ? e.soDu : 0,
        soDuCo: e.soDu < 0 ? Math.abs(e.soDu) : 0,
      })),
    };
  }

  async getAll(): Promise<SoCaiByAccount[]> {
    const data = await this.get<Array<{
      taiKhoan: { ma: string; ten: string; loai: string };
      soDuDauKy: number;
      entries: Array<{ ngay: string; soPhieu: string; noiDung: string; no: number; co: number; soDu: number }>;
      tongNo: number;
      tongCo: number;
      soDuCuoiKy: number;
    }>>({ endpoint: '/all' });

    return data.map((item) => ({
      taiKhoan: item.taiKhoan.ma,
      tenTaiKhoan: item.taiKhoan.ten,
      soDuDauKyNo: item.taiKhoan.loai === 'NO' ? item.soDuDauKy : 0,
      soDuDauKyCo: item.taiKhoan.loai === 'CO' ? item.soDuDauKy : 0,
      phatSinhNo: item.tongNo,
      phatSinhCo: item.tongCo,
      soDuCuoiKyNo: item.taiKhoan.loai === 'NO' ? Math.max(0, item.soDuCuoiKy) : 0,
      soDuCuoiKyCo: item.taiKhoan.loai === 'CO' ? Math.max(0, item.soDuCuoiKy) : 0,
      chiTiet: item.entries.map((e) => ({
        ngay: new Date(e.ngay).toLocaleDateString('vi-VN'),
        soPhieu: e.soPhieu,
        loaiChungTu: e.no > 0 ? 'Phiếu chi' : 'Phiếu thu',
        dienGiai: e.noiDung,
        phatSinhNo: e.no,
        phatSinhCo: e.co,
        soDuNo: e.soDu > 0 ? e.soDu : 0,
        soDuCo: e.soDu < 0 ? Math.abs(e.soDu) : 0,
      })),
    }));
  }

  async getSummaryByAccount(): Promise<SoCaiByAccount[]> {
    const data = await this.get<AccountSummary[]>({ endpoint: '/summary-by-account' });
    return data.map((item) => ({
      taiKhoan: item.ma,
      tenTaiKhoan: item.ten,
      soDuDauKyNo: item.soDuDauKy > 0 ? item.soDuDauKy : 0,
      soDuDauKyCo: item.soDuDauKy < 0 ? Math.abs(item.soDuDauKy) : 0,
      phatSinhNo: item.phatSinh / 2, // Approximate split
      phatSinhCo: item.phatSinh / 2,
      soDuCuoiKyNo: item.soDuCuoiKy > 0 ? item.soDuCuoiKy : 0,
      soDuCuoiKyCo: item.soDuCuoiKy < 0 ? Math.abs(item.soDuCuoiKy) : 0,
      chiTiet: [],
    }));
  }

  async getStats(startDate?: string, endDate?: string): Promise<SoCaiStats> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.get<SoCaiStats>({ endpoint: '/stats', params });
  }

  async getTrialBalance(startDate?: string, endDate?: string): Promise<TrialBalance[]> {
    const now = new Date();
    const sd = startDate || new Date(now.getFullYear(), 0, 1).toISOString();
    const ed = endDate || now.toISOString();
    const data = await this.get<TrialBalanceResponse>({
      endpoint: '/trial-balance',
      params: { startDate: sd, endDate: ed },
    });

    const mapEntry = (item: TrialBalanceEntry): TrialBalance => ({
      taiKhoan: item.ma,
      tenTaiKhoan: item.ten,
      soDuDauKyNo: item.noDauKy,
      soDuDauKyCo: item.coDauKy,
      phatSinhNo: item.noPhatSinh,
      phatSinhCo: item.coPhatSinh,
      soDuCuoiKyNo: item.noCuoiKy,
      soDuCuoiKyCo: item.coCuoiKy,
      soTaiKhoan: item.soTaiKhoan,
      tenNganHang: item.tenNganHang,
      tenTaiKhoanNH: item.tenTaiKhoanNH,
    });

    return data.entries.map((item) => ({
      ...mapEntry(item),
      doiTuongChiTiet: item.doiTuongChiTiet?.map(mapEntry),
    }));
  }

  async getByAccount(taiKhoan: string): Promise<SoCaiByAccount | null> {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return this.getLedger(taiKhoan, startOfYear, now);
  }
}

export const soCaiService = new SoCaiService();
