import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

describe('ChungTuService.getStats', () => {
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

  it('returns tongSo + tongTien for the loai', async () => {
    aggregate.mockResolvedValue([{ tongSo: 3, tongTien: 900 }]);
    const res = await service.getStats('PHIEU_THU', {});
    expect(res.data).toEqual({ tongSo: 3, tongTien: 900 });
  });

  it('returns zeros when empty', async () => {
    aggregate.mockResolvedValue([]);
    const res = await service.getStats('PHIEU_CHI', {});
    expect(res.data).toEqual({ tongSo: 0, tongTien: 0 });
  });
});
