import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MamNonSequence } from '@app/entities';
import { TenantContextService } from '@app/core';

const PREFIX: Record<string, string> = { DE_XUAT: 'DX' };

@Injectable()
export class MamNonSequenceService {
  constructor(
    @InjectRepository(MamNonSequence) private readonly repo: Repository<MamNonSequence>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  format(loai: string, n: number): string {
    return `${PREFIX[loai] ?? 'MN'}${String(n).padStart(5, '0')}`;
  }

  async next(loai: string): Promise<string> {
    const found = await this.repo.findOne({ where: { loai, ...this.tenantFilter() } as any });
    const seq = found ?? (this.repo.create({ loai, current: 0, ...this.tenantFilter() } as any) as unknown as MamNonSequence);
    seq.current = (seq.current ?? 0) + 1;
    await this.repo.save(seq);
    return this.format(loai, seq.current);
  }
}
