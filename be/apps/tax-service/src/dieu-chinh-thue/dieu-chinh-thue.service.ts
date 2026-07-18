import { sanitizeUpdateDto, TenantContextService } from '@app/core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DieuChinhThue } from '@app/entities';
import { UpdateDieuChinhThueDto } from './dto';

const ARRAY_FIELDS: (keyof UpdateDieuChinhThueDto)[] = [
  'cpkdtDichVuHangHoa',
  'cpkdtTscdCcdc',
  'cpkdtNhanCong',
  'cpkdtTaiChinhKhac',
  'thuNhapMienThue',
  'loDuocChuyen',
  'thueTNCN',
  'bhxh3383',
  'bhyt3384',
  'bhtn3386',
];

@Injectable()
export class DieuChinhThueService {
  constructor(
    @InjectRepository(DieuChinhThue)
    private readonly repo: Repository<DieuChinhThue>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  /** Trả về bản ghi điều chỉnh của năm; nếu chưa có thì trả default (không lưu). */
  async getOrDefault(nam: number): Promise<Partial<DieuChinhThue>> {
    const found = await this.repo.findOne({
      where: { nam, isActive: true, ...this.getTenantFilter() } as any,
    });
    if (found) return found;
    const blank: Partial<DieuChinhThue> = { nam };
    for (const f of ARRAY_FIELDS) (blank as any)[f] = [0, 0, 0, 0];
    return blank;
  }

  /** Tạo mới hoặc cập nhật bản ghi điều chỉnh cho năm. */
  async upsert(
    nam: number,
    dto: UpdateDieuChinhThueDto,
  ): Promise<DieuChinhThue> {
    const clean = sanitizeUpdateDto(dto);
    let item = await this.repo.findOne({
      where: { nam, ...this.getTenantFilter() } as any,
    });
    if (item) {
      Object.assign(item, clean);
      item.isActive = true;
      return this.repo.save(item);
    }
    item = this.repo.create({ nam, isActive: true });
    for (const f of ARRAY_FIELDS) {
      (item as any)[f] = (clean as any)[f] ?? [0, 0, 0, 0];
    }
    return this.repo.save(item);
  }
}
