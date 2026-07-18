import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

describe('ChungTuService.findAllPaginated', () => {
  const aggregate = jest.fn();
  const repo = { aggregate: () => ({ toArray: aggregate }) };
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => undefined } },
        { provide: LoaiResolverService, useValue: { resolveLoai: async (_dm, fb) => fb } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  it('returns paginated data with meta from facet', async () => {
    aggregate.mockResolvedValue([{ data: [{ soPhieu: 'PT001/2026' }], totalArr: [{ count: 1 }] }]);
    const res = await service.findAllPaginated('PHIEU_THU', { page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.meta.total).toBe(1);
    expect(res.meta.totalPages).toBe(1);
  });

  it('returns empty meta when no docs', async () => {
    aggregate.mockResolvedValue([{ data: [], totalArr: [] }]);
    const res = await service.findAllPaginated('PHIEU_CHI', { page: 1, limit: 10 });
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
    expect(res.meta.totalPages).toBe(0);
  });
});
