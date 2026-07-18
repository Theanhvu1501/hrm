import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

describe('ChungTuService.importPhieu', () => {
  const create = jest.fn((x) => x);
  const save = jest.fn((x) => Promise.resolve(x));
  const repo = { create, save };
  const generateVoucherNumbers = jest.fn();
  let service: ChungTuService;

  beforeEach(async () => {
    create.mockClear(); save.mockClear(); generateVoucherNumbers.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: { generateVoucherNumbers } },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => undefined } },
        { provide: LoaiResolverService, useValue: { resolveLoai: async (_dm: any, fb: any) => fb } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  it('assigns one soPhieu per item and forces loai', async () => {
    generateVoucherNumbers.mockResolvedValue(['PT001/2026', 'PT002/2026']);
    const items = [
      { ngay: '2026-01-01', soTien: 100, noiDung: 'a' },
      { ngay: '2026-01-02', soTien: 200, noiDung: 'b' },
    ];
    const res = await service.importPhieu('PHIEU_THU', items, 'user1');
    expect(generateVoucherNumbers).toHaveBeenCalledWith('PHIEU_THU', 2);
    expect(res.data).toHaveLength(2);
    expect(res.data[0].soPhieu).toBe('PT001/2026');
    expect(res.data[0].loai).toBe('PHIEU_THU');
  });

  it('returns empty for empty input', async () => {
    const res = await service.importPhieu('PHIEU_CHI', [], 'user1');
    expect(res.data).toEqual([]);
    expect(generateVoucherNumbers).not.toHaveBeenCalled();
  });
});
