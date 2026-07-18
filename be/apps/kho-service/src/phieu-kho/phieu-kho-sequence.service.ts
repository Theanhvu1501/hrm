import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhieuKhoSequence } from '@app/entities';
import { TenantContextService } from '@app/core';

const PREFIX: Record<string, string> = { NHAP: 'NK', XUAT: 'XK', CHUYEN: 'CK' };

@Injectable()
export class PhieuKhoSequenceService {
  constructor(
    @InjectRepository(PhieuKhoSequence) private readonly repo: Repository<PhieuKhoSequence>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  format(loaiPhieu: string, n: number): string {
    return `${PREFIX[loaiPhieu] ?? 'PK'}${String(n).padStart(5, '0')}`;
  }

  async peek(loaiPhieu: string): Promise<string> {
    const seq = await this.repo.findOne({ where: { loaiPhieu, ...this.tenantFilter() } as any });
    return this.format(loaiPhieu, (seq?.current ?? 0) + 1);
  }

  async next(loaiPhieu: string): Promise<string> {
    const found = await this.repo.findOne({ where: { loaiPhieu, ...this.tenantFilter() } as any });
    const seq: PhieuKhoSequence = found ?? (this.repo.create({ loaiPhieu, current: 0, ...this.tenantFilter() } as any) as unknown as PhieuKhoSequence);
    seq.current = (seq.current ?? 0) + 1;
    await this.repo.save(seq);
    return this.format(loaiPhieu, seq.current);
  }
}
