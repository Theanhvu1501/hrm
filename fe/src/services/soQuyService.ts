import { SoQuy } from '@/types';
import { ServiceBase } from './base/service-base';

export interface SoQuyStats {
  tonDauKy: number;
  tongThu: number;
  tongChi: number;
  tonCuoiKy: number;
}

export interface DailySummary {
  ngay: string;
  thu: number;
  chi: number;
  soDu: number;
}

export interface MonthlyCashReport {
  soDuDauKy: number;
  tongThu: number;
  tongChi: number;
  soDuCuoiKy: number;
  entries: SoQuy[];
}

class SoQuyService extends ServiceBase {
  constructor() {
    super({ endpoint: '/cash-book/so-quy' });
  }

  async getAll(): Promise<SoQuy[]> {
    return this.get<SoQuy[]>();
  }

  async getByDateRange(startDate: string, endDate: string): Promise<SoQuy[]> {
    return this.get<SoQuy[]>({
      endpoint: '/by-date-range',
      params: { startDate, endDate },
    });
  }

  async getByMonth(
    month: number,
    year: number,
  ): Promise<MonthlyCashReport> {
    return this.get<MonthlyCashReport>({
      endpoint: '/by-month',
      params: { month: month.toString(), year: year.toString() },
    });
  }

  async getStats(): Promise<SoQuyStats> {
    return this.get<SoQuyStats>({ endpoint: '/stats' });
  }

  async search(keyword: string): Promise<SoQuy[]> {
    return this.get<SoQuy[]>({ endpoint: '/search', params: { keyword } });
  }

  async getDailySummary(): Promise<DailySummary[]> {
    return this.get<DailySummary[]>({ endpoint: '/daily-summary' });
  }
}

export const soQuyService = new SoQuyService();
