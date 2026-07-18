import { ServiceBase } from './base/service-base';

// ============ BE Response Types ============

interface PnLEntryResponse {
  ma: string;
  ten: string;
  soTien: number;
}

interface PnLResponse {
  doanhThu: PnLEntryResponse[];
  chiPhi: PnLEntryResponse[];
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
}

// ============ FE Display Types ============

export interface PnLSummary {
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuanTruocThue: number;
  thue: number;
  loiNhuanSauThue: number;
  tyLeLoiNhuanRong: number;
}

export interface PnLItem {
  ma: string;
  ten: string;
  soTien: number;
}

export interface PnLGroupedData {
  category: { key: string; name: string; type: 'revenue' | 'expense' };
  items: PnLItem[];
  subtotal: number;
}

export interface PnLData {
  doanhThu: PnLItem[];
  chiPhi: PnLItem[];
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
}

export interface PnLComparisonData {
  doanhThu: PnLItem[];
  chiPhi: PnLItem[];
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
  kyTruoc: {
    doanhThu: PnLItem[];
    chiPhi: PnLItem[];
    tongDoanhThu: number;
    tongChiPhi: number;
    loiNhuan: number;
  };
  kyHienTai: { startDate: string; endDate: string };
  kyTruocPeriod: { startDate: string; endDate: string };
}

// ============ Helpers ============

function getDateRange(period: 'thangNay' | 'thangTruoc' | 'luyKe'): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'thangNay':
      return {
        startDate: new Date(year, month, 1).toISOString(),
        endDate: now.toISOString(),
      };
    case 'thangTruoc':
      return {
        startDate: new Date(year, month - 1, 1).toISOString(),
        endDate: new Date(year, month, 0).toISOString(),
      };
    case 'luyKe':
      return {
        startDate: new Date(year, 0, 1).toISOString(),
        endDate: now.toISOString(),
      };
  }
}

// ============ Service ============

class PnLServiceImpl extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  private async fetchPnL(startDate: string, endDate: string): Promise<PnLResponse> {
    return this.get<PnLResponse>({
      endpoint: '/pnl',
      params: { startDate, endDate },
    });
  }

  async getPnLData(period: 'thangNay' | 'thangTruoc' | 'luyKe' = 'thangNay'): Promise<PnLData> {
    const { startDate, endDate } = getDateRange(period);
    const res = await this.fetchPnL(startDate, endDate);

    return {
      doanhThu: res.doanhThu.map(e => ({ ma: e.ma, ten: e.ten, soTien: e.soTien })),
      chiPhi: res.chiPhi.map(e => ({ ma: e.ma, ten: e.ten, soTien: e.soTien })),
      tongDoanhThu: res.tongDoanhThu,
      tongChiPhi: res.tongChiPhi,
      loiNhuan: res.loiNhuan,
    };
  }

  async getGroupedPnLData(period: 'thangNay' | 'thangTruoc' | 'luyKe' = 'thangNay'): Promise<PnLGroupedData[]> {
    const data = await this.getPnLData(period);

    return [
      {
        category: { key: 'doanh_thu', name: 'DOANH THU', type: 'revenue' },
        items: data.doanhThu,
        subtotal: data.tongDoanhThu,
      },
      {
        category: { key: 'chi_phi', name: 'CHI PHÍ', type: 'expense' },
        items: data.chiPhi,
        subtotal: data.tongChiPhi,
      },
    ];
  }

  async getComparison(startDate: string, endDate: string, periodType: string): Promise<PnLComparisonData> {
    return this.get<PnLComparisonData>({
      endpoint: '/pnl',
      params: { startDate, endDate, periodType },
    });
  }

  async getSummary(period: 'thangNay' | 'thangTruoc' | 'luyKe' = 'thangNay', startDate?: string, endDate?: string): Promise<PnLSummary> {
    const range = getDateRange(period);
    const sd = startDate || range.startDate;
    const ed = endDate || range.endDate;
    const res = await this.fetchPnL(sd, ed);

    const loiNhuanTruocThue = res.loiNhuan;
    const thue = loiNhuanTruocThue > 0 ? loiNhuanTruocThue * 0.2 : 0;
    const loiNhuanSauThue = loiNhuanTruocThue - thue;

    return {
      tongDoanhThu: res.tongDoanhThu,
      tongChiPhi: res.tongChiPhi,
      loiNhuanTruocThue,
      thue,
      loiNhuanSauThue,
      tyLeLoiNhuanRong: res.tongDoanhThu > 0 ? (loiNhuanSauThue / res.tongDoanhThu) * 100 : 0,
    };
  }
}

export const pnlService = new PnLServiceImpl();
