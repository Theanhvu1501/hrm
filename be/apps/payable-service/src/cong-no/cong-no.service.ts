import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongNo, LoaiCongNo } from '@app/entities';
import { TenantContextService } from '@app/core';

export interface AgingBucket {
  range: string;
  count: number;
  total: number;
}

export interface GroupedCongNo {
  doiTuongId: string;
  doiTuongTen?: string;
  tongNo: number;
  daThu: number;
  conLai: number;
  items: CongNo[];
}

export interface CongNoStats {
  tongCongNo: number;
  daThu: number;
  conLai: number;
  soKhoanNo: number;
  soKhoanQuaHan: number;
  agingBuckets: AgingBucket[];
}

@Injectable()
export class CongNoService {
  constructor(
    @InjectRepository(CongNo)
    private readonly congNoRepository: Repository<CongNo>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async findAll(loai?: LoaiCongNo): Promise<CongNo[]> {
    const where = loai ? { loai } : {};
    return this.congNoRepository.find({ where });
  }

  async findOne(id: string): Promise<CongNo> {
    const { ObjectId } = await import('mongodb');
    const congNo = await this.congNoRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!congNo) {
      throw new NotFoundException(`Không tìm thấy công nợ với ID ${id}`);
    }

    return congNo;
  }

  async findByDoiTuong(
    doiTuongId: string,
    loai?: LoaiCongNo,
  ): Promise<CongNo[]> {
    const where: any = { doiTuongId };
    if (loai) where.loai = loai;
    return this.congNoRepository.find({ where });
  }

  /**
   * Get receivables (công nợ phải thu) grouped by customer
   */
  async getPhaiThuGrouped(): Promise<GroupedCongNo[]> {
    const items = await this.findAll('PHAI_THU');
    return this.groupByDoiTuong(items);
  }

  /**
   * Get payables (công nợ phải trả) grouped by supplier
   */
  async getPhaiTraGrouped(): Promise<GroupedCongNo[]> {
    const items = await this.findAll('PHAI_TRA');
    return this.groupByDoiTuong(items);
  }

  /**
   * Get statistics for receivables
   */
  async getPhaiThuStats(): Promise<CongNoStats> {
    const items = await this.findAll('PHAI_THU');
    return this.calculateStats(items);
  }

  /**
   * Get statistics for payables
   */
  async getPhaiTraStats(): Promise<CongNoStats> {
    const items = await this.findAll('PHAI_TRA');
    return this.calculateStats(items);
  }

  /**
   * Update payment status
   */
  async updatePayment(id: string, soTienTra: number): Promise<CongNo> {
    const congNo = await this.findOne(id);
    congNo.daThu += soTienTra;
    congNo.conLai = congNo.soTienGoc - congNo.daThu;

    if (congNo.conLai <= 0) {
      congNo.trangThai = 'DA_THU_DU';
    } else if (congNo.daThu > 0) {
      congNo.trangThai = 'DA_THU_MOT_PHAN';
    }

    return this.congNoRepository.save(congNo);
  }

  /**
   * Group items by doiTuongId
   */
  private groupByDoiTuong(items: CongNo[]): GroupedCongNo[] {
    const groups = new Map<string, CongNo[]>();

    for (const item of items) {
      const existing = groups.get(item.doiTuongId) || [];
      existing.push(item);
      groups.set(item.doiTuongId, existing);
    }

    const result: GroupedCongNo[] = [];
    for (const [doiTuongId, groupItems] of groups) {
      const tongNo = groupItems.reduce((sum, i) => sum + (i.soTienGoc || 0), 0);
      const daThu = groupItems.reduce((sum, i) => sum + (i.daThu || 0), 0);

      result.push({
        doiTuongId,
        doiTuongTen: groupItems[0]?.doiTuongTen,
        tongNo,
        daThu,
        conLai: tongNo - daThu,
        items: groupItems,
      });
    }

    return result;
  }

  /**
   * Calculate statistics with aging buckets
   */
  private calculateStats(items: CongNo[]): CongNoStats {
    const today = new Date();
    const buckets: Record<string, { count: number; total: number }> = {
      '0-30': { count: 0, total: 0 },
      '31-60': { count: 0, total: 0 },
      '61-90': { count: 0, total: 0 },
      '>90': { count: 0, total: 0 },
    };

    let tongCongNo = 0;
    let daThu = 0;
    let soKhoanQuaHan = 0;

    for (const item of items) {
      tongCongNo += item.soTienGoc || 0;
      daThu += item.daThu || 0;

      const dueDate = item.hanThanhToan ? new Date(item.hanThanhToan) : null;
      if (dueDate) {
        const daysPastDue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysPastDue > 0 && (item.conLai || 0) > 0) {
          soKhoanQuaHan++;
          const remaining = item.conLai || 0;

          if (daysPastDue <= 30) {
            buckets['0-30'].count++;
            buckets['0-30'].total += remaining;
          } else if (daysPastDue <= 60) {
            buckets['31-60'].count++;
            buckets['31-60'].total += remaining;
          } else if (daysPastDue <= 90) {
            buckets['61-90'].count++;
            buckets['61-90'].total += remaining;
          } else {
            buckets['>90'].count++;
            buckets['>90'].total += remaining;
          }
        }
      }
    }

    return {
      tongCongNo,
      daThu,
      conLai: tongCongNo - daThu,
      soKhoanNo: items.length,
      soKhoanQuaHan,
      agingBuckets: Object.entries(buckets).map(([range, data]) => ({
        range,
        count: data.count,
        total: data.total,
      })),
    };
  }

  /**
   * Create a new payable/receivable record
   */
  async create(data: Partial<CongNo>): Promise<CongNo> {
    const congNo = this.congNoRepository.create(data);
    return this.congNoRepository.save(congNo);
  }

  /**
   * Search receivables/payables by keyword in doiTuongId
   */
  async search(keyword: string, loai?: LoaiCongNo): Promise<CongNo[]> {
    const items = await this.findAll(loai);
    const lowerKeyword = keyword.toLowerCase();
    return items.filter((item) =>
      item.doiTuongId.toLowerCase().includes(lowerKeyword),
    );
  }

  /**
   * Get overdue items with calculated soNgayQuaHan and tinhTrangQuaHan
   */
  async getQuaHan(loai: LoaiCongNo): Promise<
    (CongNo & {
      soNgayQuaHan: number;
      tinhTrangQuaHan:
        | 'CHUA_DEN_HAN'
        | 'SAP_DEN_HAN'
        | 'QUA_HAN'
        | 'QUA_HAN_NGHIEM_TRONG';
    })[]
  > {
    const items = await this.findAll(loai);
    const today = new Date();

    return items
      .filter((item) => item.hanThanhToan && (item.conLai || 0) > 0)
      .map((item) => {
        const dueDate = new Date(item.hanThanhToan!);
        const daysDiff = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        let tinhTrangQuaHan:
          | 'CHUA_DEN_HAN'
          | 'SAP_DEN_HAN'
          | 'QUA_HAN'
          | 'QUA_HAN_NGHIEM_TRONG';
        if (daysDiff < -7) {
          tinhTrangQuaHan = 'CHUA_DEN_HAN';
        } else if (daysDiff < 0) {
          tinhTrangQuaHan = 'SAP_DEN_HAN';
        } else if (daysDiff <= 30) {
          tinhTrangQuaHan = 'QUA_HAN';
        } else {
          tinhTrangQuaHan = 'QUA_HAN_NGHIEM_TRONG';
        }

        return {
          ...item,
          id: item.id,
          soNgayQuaHan: Math.max(0, daysDiff),
          tinhTrangQuaHan,
        };
      })
      .filter((item) => item.soNgayQuaHan > 0);
  }

  /**
   * Get aging report with buckets
   */
  async getAgingReport(loai: LoaiCongNo): Promise<{
    chuaDenHan: number;
    quaHan1_30: number;
    quaHan31_60: number;
    quaHan61_90: number;
    quaHanTren90: number;
  }> {
    const items = await this.findAll(loai);
    const today = new Date();

    const result = {
      chuaDenHan: 0,
      quaHan1_30: 0,
      quaHan31_60: 0,
      quaHan61_90: 0,
      quaHanTren90: 0,
    };

    for (const item of items) {
      const remaining = item.conLai || 0;
      if (remaining <= 0) continue;

      if (!item.hanThanhToan) {
        result.chuaDenHan += remaining;
        continue;
      }

      const dueDate = new Date(item.hanThanhToan);
      const daysPastDue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysPastDue <= 0) {
        result.chuaDenHan += remaining;
      } else if (daysPastDue <= 30) {
        result.quaHan1_30 += remaining;
      } else if (daysPastDue <= 60) {
        result.quaHan31_60 += remaining;
      } else if (daysPastDue <= 90) {
        result.quaHan61_90 += remaining;
      } else {
        result.quaHanTren90 += remaining;
      }
    }

    return result;
  }

  /**
   * Số dư công nợ cộng dồn đến cuối mỗi tháng của năm chọn, tách phải thu/phải trả.
   * Dùng conLai hiện tại + ngayPhatSinh (BE không lưu lịch sử thanh toán theo ngày).
   */
  async getCongNoSeries(
    year: number,
  ): Promise<{ thang: number; tongPhaiThu: number; tongPhaiTra: number }[]> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    const all = await this.congNoRepository.find({ where });

    return Array.from({ length: 12 }, (_, i) => {
      const thang = i + 1;
      const endOfMonth = new Date(year, thang, 0, 23, 59, 59, 999);
      let tongPhaiThu = 0;
      let tongPhaiTra = 0;
      for (const c of all) {
        if (!c.ngayPhatSinh) continue;
        if (new Date(c.ngayPhatSinh) > endOfMonth) continue;
        if (c.loai === 'PHAI_THU') tongPhaiThu += c.conLai || 0;
        else if (c.loai === 'PHAI_TRA') tongPhaiTra += c.conLai || 0;
      }
      return { thang, tongPhaiThu, tongPhaiTra };
    });
  }

  /**
   * Get summary by customer/supplier
   */
  async getSummaryByCounterparty(loai: LoaiCongNo): Promise<
    {
      doiTuongId: string;
      doiTuongTen?: string;
      tongNo: number;
      daThu: number;
      conLai: number;
      soHoaDon: number;
      quaHan: number;
    }[]
  > {
    const items = await this.findAll(loai);
    const today = new Date();
    const groups = new Map<
      string,
      {
        doiTuongTen?: string;
        tongNo: number;
        daThu: number;
        soHoaDon: number;
        quaHan: number;
      }
    >();

    for (const item of items) {
      const existing = groups.get(item.doiTuongId) || {
        doiTuongTen: item.doiTuongTen,
        tongNo: 0,
        daThu: 0,
        soHoaDon: 0,
        quaHan: 0,
      };

      existing.tongNo += item.soTienGoc || 0;
      existing.daThu += item.daThu || 0;
      existing.soHoaDon++;

      if (item.hanThanhToan) {
        const dueDate = new Date(item.hanThanhToan);
        if (today > dueDate && (item.conLai || 0) > 0) {
          existing.quaHan += item.conLai || 0;
        }
      }

      groups.set(item.doiTuongId, existing);
    }

    return Array.from(groups.entries()).map(([doiTuongId, data]) => ({
      doiTuongId,
      doiTuongTen: data.doiTuongTen,
      tongNo: data.tongNo,
      daThu: data.daThu,
      conLai: data.tongNo - data.daThu,
      soHoaDon: data.soHoaDon,
      quaHan: data.quaHan,
    }));
  }
}
