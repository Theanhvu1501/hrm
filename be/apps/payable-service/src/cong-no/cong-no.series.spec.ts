import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContextService } from '@app/core';
import { CongNo } from '@app/entities';
import { CongNoService } from './cong-no.service';

describe('CongNoService.getCongNoSeries', () => {
  function build(records: Partial<CongNo>[], tenantId?: string) {
    const repo = { find: jest.fn().mockResolvedValue(records) };
    return Test.createTestingModule({
      providers: [
        CongNoService,
        { provide: getRepositoryToken(CongNo), useValue: repo },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => tenantId } },
      ],
    }).compile().then((m) => ({ svc: m.get(CongNoService), repo }));
  }

  it('số dư cộng dồn theo conLai đến cuối mỗi tháng, tách loại', async () => {
    const { svc } = await build([
      { loai: 'PHAI_THU', conLai: 100, ngayPhatSinh: new Date(2026, 0, 15) }, // T1
      { loai: 'PHAI_THU', conLai: 50, ngayPhatSinh: new Date(2026, 2, 10) },  // T3
      { loai: 'PHAI_TRA', conLai: 70, ngayPhatSinh: new Date(2026, 1, 5) },   // T2
    ]);
    const r = await svc.getCongNoSeries(2026);
    expect(r).toHaveLength(12);
    expect(r[0]).toEqual({ thang: 1, tongPhaiThu: 100, tongPhaiTra: 0 });   // đến cuối T1
    expect(r[1]).toEqual({ thang: 2, tongPhaiThu: 100, tongPhaiTra: 70 });  // đến cuối T2
    expect(r[2]).toEqual({ thang: 3, tongPhaiThu: 150, tongPhaiTra: 70 });  // đến cuối T3
  });

  it('lọc theo tenantId khi có', async () => {
    const { svc, repo } = await build([], 'tenant-A');
    await svc.getCongNoSeries(2026);
    expect(repo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-A' } });
  });

  it('không lọc tenant khi không có tenantId', async () => {
    const { svc, repo } = await build([]);
    await svc.getCongNoSeries(2026);
    expect(repo.find).toHaveBeenCalledWith({ where: {} });
  });
});
