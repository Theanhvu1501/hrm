import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { DeXuatMuaThucPham } from '@app/entities';
import { ServiceClient } from '@app/service-client';
import { CreateDeXuatMuaDto, UpdateDeXuatMuaDto } from './dto';
import { MamNonSequenceService } from './mam-non-sequence.service';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';
import { buildButToanNhanHang, buildPhieuNhapKho } from './nhan-hang.builder';

export function tinhTongTien(chiTiet: { thanhTien?: number }[]): number {
  return (chiTiet ?? []).reduce((s, c) => s + (c.thanhTien ?? 0), 0);
}

@Injectable()
export class DeXuatMuaService {
  constructor(
    @InjectRepository(DeXuatMuaThucPham) private readonly repo: Repository<DeXuatMuaThucPham>,
    private readonly sequence: MamNonSequenceService,
    private readonly tenantContext: TenantContextService,
    private readonly serviceClient: ServiceClient,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<DeXuatMuaThucPham>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = all.filter((i) => i.isActive !== false);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((i) => (i.soPhieu || '').toLowerCase().includes(s) || (i.doiTuongTen || '').toLowerCase().includes(s));
    }
    const total = items.length;
    return { data: items.slice(skip, skip + limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<DeXuatMuaThucPham> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy đề xuất với ID ${id}`);
    return item;
  }

  async create(dto: CreateDeXuatMuaDto): Promise<DeXuatMuaThucPham> {
    const soPhieu = await this.sequence.next('DE_XUAT');
    const tongTien = tinhTongTien(dto.chiTiet);
    const item = this.repo.create({
      ...dto, soPhieu, tongTien, ngayDeXuat: new Date(dto.ngayDeXuat),
      trangThai: 'NHAP', isActive: true, ...this.getTenantFilter(),
    } as any);
    return this.repo.save(item) as any;
  }

  async update(id: string, dto: UpdateDeXuatMuaDto): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'NHAP') throw new BadRequestException('Chỉ sửa được đề xuất ở trạng thái NHAP');
    const patch: any = sanitizeUpdateDto(dto);
    if (patch.ngayDeXuat) patch.ngayDeXuat = new Date(patch.ngayDeXuat);
    if (patch.chiTiet) patch.tongTien = tinhTongTien(patch.chiTiet);
    Object.assign(item, patch);
    return this.repo.save(item);
  }

  async submit(id: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'NHAP') throw new BadRequestException('Chỉ gửi duyệt đề xuất ở trạng thái NHAP');
    item.trangThai = 'CHO_DUYET';
    return this.repo.save(item);
  }

  async approve(id: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'CHO_DUYET') throw new BadRequestException('Chỉ duyệt đề xuất ở trạng thái CHO_DUYET');
    item.trangThai = 'DA_DUYET';
    item.nguoiDuyet = this.tenantContext.getCurrentEmail?.() ?? '';
    item.ngayDuyet = new Date();
    return this.repo.save(item);
  }

  async reject(id: string, lyDo: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'CHO_DUYET') throw new BadRequestException('Chỉ từ chối đề xuất ở trạng thái CHO_DUYET');
    item.trangThai = 'TU_CHOI';
    item.lyDoTuChoi = lyDo;
    return this.repo.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    if (item.trangThai === 'DA_DUYET' || item.trangThai === 'DA_NHAN') {
      throw new BadRequestException('Không thể xóa đề xuất đã duyệt/đã nhận hàng');
    }
    item.isActive = false;
    await this.repo.save(item);
  }

  /**
   * Xóa mềm hàng loạt. Giữ đúng guard của xóa đơn: đề xuất đã duyệt / đã nhận hàng không xóa được
   * → rơi vào `skipped` thay vì làm hỏng cả lô.
   */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repo as unknown as MongoRepository<DeXuatMuaThucPham>,
      ids,
      (e) => e.trangThai !== 'DA_DUYET' && e.trangThai !== 'DA_NHAN',
    );
  }

  async nhanHang(id: string, authToken?: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'DA_DUYET' && item.trangThai !== 'DA_NHAN') {
      throw new BadRequestException('Chỉ nhận hàng đề xuất đã DUYỆT');
    }
    if (!item.doiTuongMa) {
      throw new BadRequestException('Đề xuất chưa có nhà cung cấp (NCC) — không thể nhận hàng');
    }
    if (!(Number(item.tongTien) > 0)) {
      throw new BadRequestException('Tổng tiền đề xuất phải lớn hơn 0 để nhận hàng');
    }
    const headers = authToken ? { Authorization: authToken } : undefined;

    // 1) Bút toán NKC (nếu chưa tạo)
    if (!item.chungTuId) {
      const res = await this.serviceClient.post<any>('voucher', '/nhat-ky-chung', {
        headers, body: buildButToanNhanHang(item),
      });
      if (!res.success) {
        throw new BadRequestException(`Tạo bút toán thất bại: ${res.error?.message ?? res.error?.code ?? 'unknown'}`);
      }
      item.chungTuId = res.data?._id ?? res.data?.id ?? res.data?.soPhieu ?? 'created';
      await this.repo.save(item);
    }

    // 2) Phiếu nhập kho (nếu chưa tạo)
    if (!item.soPhieuNhapKho) {
      const res = await this.serviceClient.post<any>('kho', '/phieu', {
        headers, body: buildPhieuNhapKho(item),
      });
      if (!res.success) {
        throw new BadRequestException(`Tạo phiếu nhập kho thất bại: ${res.error?.message ?? res.error?.code ?? 'unknown'}`);
      }
      item.soPhieuNhapKho = res.data?.soPhieu ?? res.data?._id ?? 'created';
      await this.repo.save(item);
    }

    item.trangThai = 'DA_NHAN';
    return this.repo.save(item);
  }
}
