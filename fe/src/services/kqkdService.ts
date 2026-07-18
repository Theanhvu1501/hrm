import { ServiceBase } from './base/service-base';

// ============ Types ============

export type KqkdPeriodType = 'thang' | 'quy' | 'nam' | 'tuyChon';

export interface KqkdQueryParams {
  startDate: string;
  endDate: string;
  periodType: KqkdPeriodType;
}

export interface KqkdChiTieu {
  ma: string;
  ten: string;
  kyHienTai: number;
  phanTramDTThuan: number | null;
  tyTrongChiPhi: number | null;
  kyTruoc: number;
  phanTramDTThuanKyTruoc: number | null;
  tyTrongChiPhiKyTruoc: number | null;
  bienDong: number;
  phanTramBienDong: number | null;
  isCalculated: boolean;
  isBold: boolean;
}

export interface KqkdReport {
  chiTieu: KqkdChiTieu[];
  kyHienTai: { startDate: string; endDate: string };
  kyTruoc: { startDate: string; endDate: string };
}

// ============ Helpers ============

export function getDateRange(
  periodType: KqkdPeriodType,
  selectedDate: Date,
): { startDate: string; endDate: string } {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  switch (periodType) {
    case 'thang': {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    case 'quy': {
      const quarterStart = Math.floor(month / 3) * 3;
      const startDate = new Date(year, quarterStart, 1);
      const endDate = new Date(year, quarterStart + 3, 0);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    case 'nam': {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
    case 'tuyChon':
      return { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() };
  }
}

// ============ Service ============

class KqkdServiceImpl extends ServiceBase {
  constructor() {
    super({ endpoint: '/reporting/bao-cao' });
  }

  async getData(params: KqkdQueryParams): Promise<KqkdReport> {
    return this.get<KqkdReport>({
      endpoint: '/kqkd',
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        periodType: params.periodType,
      },
    });
  }
}

export const kqkdService = new KqkdServiceImpl();
