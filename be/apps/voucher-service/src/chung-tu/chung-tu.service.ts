import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Between } from 'typeorm';
import { ChungTu, LoaiChungTu } from '@app/entities';
import { CreateChungTuDto, UpdateChungTuDto } from '../dto';
import { VoucherNumberService, LoaiResolverService } from '../shared';
import { PaginatedResult } from '@app/dto';
import { TenantContextService } from '@app/core';
import { ChungTuQueryDto } from './dto/chung-tu-query.dto';
import { buildChungTuMongoQuery } from './helpers';
import { buildSummaryAggregation } from '../nhat-ky-chung/helpers';
import { SummaryType, SummaryItem } from '../nhat-ky-chung/dto';

/**
 * TODO: Các API cần thêm lại sau khi refactor:
 *
 * 1. submitForApproval(id) - NHAP → CHO_DUYET
 * 2. approve(id, nguoiDuyetId) - CHO_DUYET → DA_DUYET
 * 3. reject(id, nguoiDuyetId, rejectDto) - CHO_DUYET → TU_CHOI
 * 4. getPhieuThuStats() - Thống kê phiếu thu
 * 5. getPhieuChiStats() - Thống kê phiếu chi
 * 6. getNhatKyChungStats() - Thống kê nhật ký chung
 * 7. getSummaryByAccount() - Tổng hợp theo tài khoản
 * 8. getSummaryByTeam() - Tổng hợp theo đội
 * 9. getSummaryByEmployee() - Tổng hợp theo nhân viên
 * 10. getSummaryByProject() - Tổng hợp theo dự án
 * 11. getSummaryByChuDauTu() - Tổng hợp theo chủ đầu tư
 * 12. getSummaryBySanPham() - Tổng hợp theo sản phẩm
 * 13. getSummaryByDongTien() - Tổng hợp theo dòng tiền
 */

@Injectable()
export class ChungTuService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: MongoRepository<ChungTu>,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly tenantContext: TenantContextService,
    private readonly loaiResolver: LoaiResolverService,
  ) {}

  async findAllPaginated(
    loai: LoaiChungTu,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: ChungTu[]; meta: PaginatedResult<ChungTu>['meta'] }> {
    const { page = 1, limit = 15 } = query;
    const skip = (page - 1) * limit;

    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline: object[] = [
      { $match: mongoQuery },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalArr: [{ $count: 'count' }],
        },
      },
    ];
    const agg = await this.chungTuRepository.aggregate(pipeline).toArray();
    const facet = (agg[0] as { data: ChungTu[]; totalArr: { count: number }[] }) || { data: [], totalArr: [] };
    const total = facet.totalArr[0]?.count ?? 0;

    return {
      success: true,
      data: facet.data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(
    loai: LoaiChungTu,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: { tongSo: number; tongTien: number } }> {
    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline: object[] = [
      { $match: mongoQuery },
      { $group: { _id: null, tongSo: { $sum: 1 }, tongTien: { $sum: '$soTien' } } },
    ];
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    const s = (result[0] as { tongSo: number; tongTien: number }) || { tongSo: 0, tongTien: 0 };
    return { success: true, data: { tongSo: s.tongSo, tongTien: s.tongTien } };
  }

  async getSummary(
    loai: LoaiChungTu,
    type: SummaryType,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: SummaryItem[] }> {
    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline = buildSummaryAggregation(type, mongoQuery);
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    return { success: true, data: result as SummaryItem[] };
  }

  /**
   * Tỷ trọng tiền thu/chi theo mã dòng tiền, phân loại theo tài khoản tiền:
   * - thu: có dòng Nợ 111/112 (gồm TK con)
   * - chi: có dòng Có 111/112
   * Chỉ tính giao dịch có mã dòng tiền (bỏ qua nếu thiếu).
   */
  async getCashFlowComposition(
    which: 'thu' | 'chi',
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: { ma: string; ten?: string; soTien: number }[] }> {
    const { startDate, endDate } = query;
    const match: Record<string, unknown> = {};
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) match.tenantId = tenantId;
    if (startDate || endDate) {
      const ngay: Record<string, Date> = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        ngay.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        ngay.$lte = e;
      }
      match.ngay = ngay;
    }
    // thu: tài khoản tiền (111/112) ghi Nợ; chi: ghi Có. Khớp cả TK con (^11[12]).
    const cashField = which === 'thu' ? 'danhMuc.taiKhoanNo.ma' : 'danhMuc.taiKhoanCo.ma';
    match[cashField] = { $regex: '^11[12]' };
    match['danhMuc.dongTien.ma'] = { $exists: true, $ne: null };

    const pipeline: object[] = [
      { $match: match },
      {
        $group: {
          _id: '$danhMuc.dongTien.ma',
          ten: { $first: '$danhMuc.dongTien.ten' },
          soTien: { $sum: '$soTien' },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $project: { _id: 0, ma: '$_id', ten: 1, soTien: 1 } },
      { $sort: { soTien: -1 } },
    ];
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    return {
      success: true,
      data: result as { ma: string; ten?: string; soTien: number }[],
    };
  }

  /**
   * Dòng tiền theo tháng cho năm chọn: thu = Nợ 111/112, chi = Có 111/112 (gồm TK con),
   * tính trực tiếp bằng aggregation (không qua sổ quỹ phân trang). Lọc theo tenant.
   */
  async getCashFlowSeries(
    year: number,
    month?: number,
  ): Promise<{ success: boolean; data: { thang: number; thu: number; chi: number }[] }> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    // month có giá trị → chia theo TUẦN trong tháng (Tuần 1–5); ngược lại theo 12 tháng.
    const weekly = !!month && month >= 1 && month <= 12;
    const match: Record<string, unknown> = {
      ngay: weekly
        ? {
            $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
            $lte: new Date(year, month, 0, 23, 59, 59, 999),
          }
        : {
            $gte: new Date(year, 0, 1, 0, 0, 0, 0),
            $lte: new Date(year, 11, 31, 23, 59, 59, 999),
          },
    };
    if (tenantId) match.tenantId = tenantId;

    // Khoá nhóm: tháng (1–12) hoặc tuần trong tháng (ceil(ngày/7) → 1–5).
    const bucket = weekly
      ? { $ceil: { $divide: [{ $dayOfMonth: '$ngay' }, 7] } }
      : { $month: '$ngay' };

    const pipeline: object[] = [
      { $match: match },
      {
        $facet: {
          thu: [
            { $match: { 'danhMuc.taiKhoanNo.ma': { $regex: '^11[12]' } } },
            { $group: { _id: bucket, v: { $sum: '$soTien' } } },
          ],
          chi: [
            { $match: { 'danhMuc.taiKhoanCo.ma': { $regex: '^11[12]' } } },
            { $group: { _id: bucket, v: { $sum: '$soTien' } } },
          ],
        },
      },
    ];
    const agg = (await this.chungTuRepository.aggregate(pipeline).toArray()) as {
      thu: { _id: number; v: number }[];
      chi: { _id: number; v: number }[];
    }[];
    const facet = agg[0] || { thu: [], chi: [] };
    const thuBy = new Map(facet.thu.map((g) => [g._id, g.v]));
    const chiBy = new Map(facet.chi.map((g) => [g._id, g.v]));
    const buckets = weekly ? 5 : 12;
    const data = Array.from({ length: buckets }, (_, i) => ({
      thang: i + 1,
      thu: thuBy.get(i + 1) || 0,
      chi: chiBy.get(i + 1) || 0,
    }));
    return { success: true, data };
  }

  async findAll(loai?: LoaiChungTu): Promise<ChungTu[]> {
    const where = loai ? { loai } : {};
    return this.chungTuRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    loai?: LoaiChungTu,
  ): Promise<ChungTu[]> {
    const where: any = {
      ngay: Between(startDate, endDate),
    };
    if (loai) where.loai = loai;
    return this.chungTuRepository.find({ where, order: { ngay: 'ASC' } });
  }

  async findOne(id: string): Promise<ChungTu> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Không tìm thấy chứng từ với ID ${id}`);
    }

    return chungTu;
  }

  async create(
    createDto: CreateChungTuDto,
    nguoiTaoId: string,
  ): Promise<ChungTu> {
    // Suy ra loai từ Loại giao dịch (nếu có cấu hình); nếu không → giữ loai theo endpoint.
    const loai = await this.loaiResolver.resolveLoai(
      createDto.danhMuc,
      createDto.loai,
    );
    const soPhieu = await this.voucherNumberService.generateVoucherNumber(loai);

    const chungTu = this.chungTuRepository.create({
      ...createDto,
      loai,
      ngay: new Date(createDto.ngay),
      soPhieu,
      nguoiTaoId,
    });

    return this.chungTuRepository.save(chungTu);
  }

  async update(id: string, updateDto: UpdateChungTuDto): Promise<ChungTu> {
    const chungTu = await this.findOne(id);

    if (updateDto.ngay) {
      chungTu.ngay = new Date(updateDto.ngay);
    }
    if (updateDto.soTien !== undefined) {
      chungTu.soTien = updateDto.soTien;
    }
    if (updateDto.noiDung !== undefined) {
      chungTu.noiDung = updateDto.noiDung;
    }
    if (updateDto.danhMuc !== undefined) {
      chungTu.danhMuc = updateDto.danhMuc;
      // Đổi danhMuc (loaiGiaoDich) → suy lại loai để không lệch với cấu hình.
      // Giữ loai hiện tại làm fallback khi cấu hình không đủ để suy luận.
      chungTu.loai = await this.loaiResolver.resolveLoai(
        updateDto.danhMuc,
        chungTu.loai,
      );
    }

    return this.chungTuRepository.save(chungTu);
  }

  async delete(id: string): Promise<void> {
    const chungTu = await this.findOne(id);
    await this.chungTuRepository.remove(chungTu);
  }

  async search(keyword: string, loai?: LoaiChungTu): Promise<ChungTu[]> {
    const vouchers = await this.findAll(loai);
    const lowerKeyword = keyword.toLowerCase();
    return vouchers.filter(
      (v) =>
        v.soPhieu.toLowerCase().includes(lowerKeyword) ||
        v.noiDung.toLowerCase().includes(lowerKeyword) ||
        v.danhMuc?.doiTuong?.ten?.toLowerCase().includes(lowerKeyword),
    );
  }

  async importPhieu(
    loai: LoaiChungTu,
    items: Omit<CreateChungTuDto, 'loai'>[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    if (items.length === 0) return { success: true, data: [] };

    // Suy ra loai từng dòng theo Loại giao dịch; fallback = loai của endpoint import.
    const loaiByIndex = await Promise.all(
      items.map((item) => this.loaiResolver.resolveLoai(item.danhMuc, loai)),
    );

    // Gom index theo loai đã suy luận để đặt dải số phiếu đúng tiền tố (PT/PC/NK).
    const indicesByLoai = new Map<LoaiChungTu, number[]>();
    loaiByIndex.forEach((l, idx) => {
      const list = indicesByLoai.get(l) ?? [];
      list.push(idx);
      indicesByLoai.set(l, list);
    });

    const soPhieuByIndex: string[] = new Array(items.length);
    for (const [l, indices] of indicesByLoai) {
      const numbers = await this.voucherNumberService.generateVoucherNumbers(
        l,
        indices.length,
      );
      indices.forEach((origIdx, i) => {
        soPhieuByIndex[origIdx] = numbers[i];
      });
    }

    const chungTuList = items.map((item, idx) =>
      this.chungTuRepository.create({
        loai: loaiByIndex[idx],
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu: soPhieuByIndex[idx],
        nguoiTaoId,
      }),
    );

    const saved = await this.chungTuRepository.save(chungTuList);
    return { success: true, data: saved };
  }
}
