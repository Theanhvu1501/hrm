import { CongNo } from '@/types';
import { ServiceBase } from './base/service-base';

export interface CongNoStats {
  tongCongNo: number;
  daThu: number;
  conLai: number;
  soKhoanNo: number;
  soKhoanQuaHan: number;
  // Computed fields for UI compatibility
  conPhaiThu?: number;
  soQuaHan?: number;
  tongQuaHan?: number;
  soKhachHang?: number;
}

export interface CongNoWithOverdue extends CongNo {
  soNgayQuaHan?: number;
  tinhTrangQuaHan?: 'CHUA_DEN_HAN' | 'SAP_DEN_HAN' | 'QUA_HAN' | 'QUA_HAN_NGHIEM_TRONG';
}

export interface CongNoSummaryByCustomer extends CustomerSummary {}

export interface AgingReport {
  chuaDenHan: number;
  quaHan1_30: number;
  quaHan31_60: number;
  quaHan61_90: number;
  quaHanTren90: number;
}

export interface CustomerSummary {
  doiTuongId: string;
  doiTuongTen?: string;
  tongNo: number;
  daThu: number;
  conLai: number;
  soHoaDon?: number;
  quaHan?: number;
}

class CongNoPhaiThuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/payable/phai-thu' });
  }

  private mapCongNo(item: CongNo): CongNoWithOverdue {
    const today = new Date();
    const hanThanhToan = item.hanThanhToan ? new Date(item.hanThanhToan) : null;
    
    let soNgayQuaHan = 0;
    let tinhTrangQuaHan: CongNoWithOverdue['tinhTrangQuaHan'] = 'CHUA_DEN_HAN';
    
    if (hanThanhToan && (item.conLai || 0) > 0) {
      const daysDiff = Math.floor((today.getTime() - hanThanhToan.getTime()) / (1000 * 60 * 60 * 24));
      soNgayQuaHan = Math.max(0, daysDiff);
      
      if (daysDiff < -7) {
        tinhTrangQuaHan = 'CHUA_DEN_HAN';
      } else if (daysDiff < 0) {
        tinhTrangQuaHan = 'SAP_DEN_HAN';
      } else if (daysDiff <= 30) {
        tinhTrangQuaHan = 'QUA_HAN';
      } else {
        tinhTrangQuaHan = 'QUA_HAN_NGHIEM_TRONG';
      }
    }
    
    return {
      ...item,
      id: item._id || item.id,
      soNgayQuaHan,
      tinhTrangQuaHan,
    };
  }

  async getAll(): Promise<CongNoWithOverdue[]> {
    const data = await this.get<CongNo[]>();
    return data.map((item) => this.mapCongNo(item));
  }

  async getById(id: string): Promise<CongNoWithOverdue> {
    const data = await this.get<CongNo>({ endpoint: `/../cong-no/${id}` });
    return this.mapCongNo(data);
  }

  async search(keyword: string): Promise<CongNoWithOverdue[]> {
    const data = await this.get<CongNo[]>({ endpoint: '/search', params: { keyword } });
    return data.map((item) => this.mapCongNo(item));
  }

  async getQuaHan(): Promise<CongNoWithOverdue[]> {
    const data = await this.get<CongNo[]>({ endpoint: '/qua-han' });
    return data.map((item) => this.mapCongNo(item));
  }

  async getAgingReport(): Promise<AgingReport> {
    return this.get<AgingReport>({ endpoint: '/aging-report' });
  }

  async getSummaryByCustomer(): Promise<CustomerSummary[]> {
    return this.get<CustomerSummary[]>({ endpoint: '/summary-by-customer' });
  }

  async getGrouped(): Promise<CongNoWithOverdue[]> {
    const data = await this.get<CongNo[]>({ endpoint: '/grouped' });
    return data.map((item) => this.mapCongNo(item));
  }

  async getStats(): Promise<CongNoStats> {
    return this.get<CongNoStats>({ endpoint: '/stats' });
  }

  async getSeries(year: number): Promise<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]> {
    const data = await this.get<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]>({
      endpoint: '/../cong-no/series',
      params: { year },
    });
    return Array.isArray(data) ? data : [];
  }

  async updatePayment(id: string, soTienTra: number): Promise<CongNoWithOverdue> {
    const data = await this.put<CongNo>({ soTienTra }, { endpoint: `/../cong-no/${id}/payment` });
    return this.mapCongNo(data);
  }

  async getByDoiTuong(doiTuongId: string): Promise<CongNoWithOverdue[]> {
    const data = await this.get<CongNo[]>({ endpoint: `/../cong-no/doi-tuong/${doiTuongId}`, params: { loai: 'PHAI_THU' } });
    return data.map((item) => this.mapCongNo(item));
  }
}

export const congNoPhaiThuService = new CongNoPhaiThuService();
