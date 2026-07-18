import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';

interface ChungTu {
  _id: string;
  soPhieu: string;
  loai: 'PHIEU_THU' | 'PHIEU_CHI';
  ngay: Date;
  soTien: number;
  noiDung: string;
  doiTuongId?: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  trangThai: string;
}

export interface SoQuyEntry {
  ngay: Date;
  soPhieu: string;
  noiDung: string;
  thu: number;
  chi: number;
  soDu: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  soDuDauKy: number;
  tongThu: number;
  tongChi: number;
  soDuCuoiKy: number;
  entries: SoQuyEntry[];
}

export interface CashBookStats {
  tonDauKy: number;
  tongThu: number;
  tongChi: number;
  tonCuoiKy: number;
  soPhieuThu: number;
  soPhieuChi: number;
}

@Injectable()
export class SoQuyService {
  private voucherServiceHost: string;
  private voucherServicePort: number;

  constructor(private readonly configService: ConfigService) {
    this.voucherServiceHost =
      this.configService.get<string>('SERVICE_VOUCHER_HOST') || 'localhost';
    this.voucherServicePort =
      this.configService.get<number>('SERVICE_VOUCHER_PORT') || 3003;
  }

  /**
   * Get cash book entries with running balance
   */
  async getSoQuy(authToken?: string): Promise<SoQuyEntry[]> {
    const vouchers = await this.fetchApprovedVouchers(authToken);
    return this.calculateRunningBalance(vouchers);
  }

  /**
   * Get cash book entries by date range
   */
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<SoQuyEntry[]> {
    const vouchers = await this.fetchApprovedVouchers(
      authToken,
      startDate,
      endDate,
    );
    return this.calculateRunningBalance(vouchers);
  }

  /**
   * Get monthly cash book report with opening/closing balance
   */
  async getByMonth(
    month: number,
    year: number,
    authToken?: string,
  ): Promise<MonthlyReport> {
    // Get all vouchers up to end of month for opening balance
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Get vouchers before this month for opening balance
    const vouchersBefore = await this.fetchApprovedVouchers(
      authToken,
      undefined,
      new Date(startOfMonth.getTime() - 1),
    );

    let soDuDauKy = 0;
    for (const v of vouchersBefore) {
      if (v.loai === 'PHIEU_THU') {
        soDuDauKy += v.soTien;
      } else {
        soDuDauKy -= v.soTien;
      }
    }

    // Get vouchers for this month
    const monthVouchers = await this.fetchApprovedVouchers(
      authToken,
      startOfMonth,
      endOfMonth,
    );

    const entries = this.calculateRunningBalance(monthVouchers, soDuDauKy);

    let tongThu = 0;
    let tongChi = 0;
    for (const v of monthVouchers) {
      if (v.loai === 'PHIEU_THU') {
        tongThu += v.soTien;
      } else {
        tongChi += v.soTien;
      }
    }

    return {
      month,
      year,
      soDuDauKy,
      tongThu,
      tongChi,
      soDuCuoiKy: soDuDauKy + tongThu - tongChi,
      entries,
    };
  }

  /**
   * Get cash book statistics
   */
  async getStats(authToken?: string): Promise<CashBookStats> {
    const vouchers = await this.fetchApprovedVouchers(authToken);

    let tongThu = 0;
    let tongChi = 0;
    let soPhieuThu = 0;
    let soPhieuChi = 0;

    for (const v of vouchers) {
      if (v.loai === 'PHIEU_THU') {
        tongThu += v.soTien;
        soPhieuThu++;
      } else {
        tongChi += v.soTien;
        soPhieuChi++;
      }
    }

    // tonDauKy is 0 for now (could be configured or calculated from previous period)
    const tonDauKy = 0;

    return {
      tonDauKy,
      tongThu,
      tongChi,
      tonCuoiKy: tonDauKy + tongThu - tongChi,
      soPhieuThu,
      soPhieuChi,
    };
  }

  /**
   * Calculate running balance from vouchers
   */
  private calculateRunningBalance(
    vouchers: ChungTu[],
    initialBalance = 0,
  ): SoQuyEntry[] {
    // Sort by date
    const sorted = [...vouchers].sort(
      (a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
    );

    let soDu = initialBalance;
    const entries: SoQuyEntry[] = [];

    for (const v of sorted) {
      const thu = v.loai === 'PHIEU_THU' ? v.soTien : 0;
      const chi = v.loai === 'PHIEU_CHI' ? v.soTien : 0;
      soDu = soDu + thu - chi;

      entries.push({
        ngay: new Date(v.ngay),
        soPhieu: v.soPhieu,
        noiDung: v.noiDung,
        thu,
        chi,
        soDu,
      });
    }

    return entries;
  }

  /**
   * Search cash book entries by keyword in soPhieu or noiDung fields
   */
  async search(keyword: string, authToken?: string): Promise<SoQuyEntry[]> {
    const entries = await this.getSoQuy(authToken);
    const lowerKeyword = keyword.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.soPhieu.toLowerCase().includes(lowerKeyword) ||
        entry.noiDung.toLowerCase().includes(lowerKeyword),
    );
  }

  /**
   * Get daily summary with thu, chi, soDu per day
   */
  async getDailySummary(
    authToken?: string,
  ): Promise<{ ngay: string; thu: number; chi: number; soDu: number }[]> {
    const entries = await this.getSoQuy(authToken);

    // Group by date
    const dailyMap = new Map<
      string,
      { thu: number; chi: number; soDu: number }
    >();

    for (const entry of entries) {
      const dateKey = new Date(entry.ngay).toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { thu: 0, chi: 0, soDu: 0 };
      existing.thu += entry.thu;
      existing.chi += entry.chi;
      existing.soDu = entry.soDu; // Last balance of the day
      dailyMap.set(dateKey, existing);
    }

    return Array.from(dailyMap.entries())
      .map(([ngay, data]) => ({ ngay, ...data }))
      .sort((a, b) => a.ngay.localeCompare(b.ngay));
  }

  /**
   * Fetch approved vouchers from voucher service
   */
  private async fetchApprovedVouchers(
    authToken?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ChungTu[]> {
    return new Promise((resolve) => {
      let path = '/nhat-ky-chung';
      const params: string[] = [];

      if (startDate) {
        params.push(`startDate=${startDate.toISOString()}`);
      } else {
        params.push(`startDate=2000-01-01`);
      }

      if (endDate) {
        params.push(`endDate=${endDate.toISOString()}`);
      } else {
        params.push(`endDate=2100-12-31`);
      }

      if (params.length > 0) {
        path += `?${params.join('&')}`;
      }

      const options: http.RequestOptions = {
        hostname: this.voucherServiceHost,
        port: this.voucherServicePort,
        path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {}),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success && Array.isArray(response.data)) {
              resolve(response.data);
            } else {
              resolve([]);
            }
          } catch {
            resolve([]);
          }
        });
      });

      req.on('error', () => {
        resolve([]);
      });

      req.end();
    });
  }
}
