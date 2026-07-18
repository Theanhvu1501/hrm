import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

describe('ChungTuService.getSummary', () => {
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

  it('returns aggregated summary rows', async () => {
    aggregate.mockResolvedValue([{ key: 'DA1', ten: 'Dự án 1', phatSinhNo: 100, phatSinhCo: 0, soLuong: 2 }]);
    const res = await service.getSummary('PHIEU_THU', 'project', {});
    expect(res.success).toBe(true);
    expect(res.data[0].key).toBe('DA1');
  });
});
