import 'reflect-metadata';
import { NhatKyChungService } from './nhat-ky-chung.service';

describe('NhatKyChungService.importEntries', () => {
  function setup() {
    const created: any[] = [];
    const chungTuRepo = {
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn(async (list: any[]) => {
        created.push(...list);
        return list.map((x, i) => ({ ...x, _id: `id-${i}` }));
      }),
    };
    // voucherNumberService mock: sinh số theo prefix + count
    const voucherNumberService = {
      generateVoucherNumbers: jest.fn(async (loai: string, count: number) => {
        const prefix = loai === 'PHIEU_THU' ? 'PT' : 'PC';
        return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
      }),
    };
    const tenantContext = { getCurrentTenantId: () => undefined };
    const loaiResolver = {
      resolveLoai: async (_dm: any, fb: any) => fb,
      resolveLoaiInfo: async (_dm: any, fb: any) => ({ loai: fb }),
    };
    const service = new NhatKyChungService(
      chungTuRepo as any,
      voucherNumberService as any,
      tenantContext as any,
      loaiResolver as any,
    );
    return { service, chungTuRepo, voucherNumberService, created };
  }

  it('mỗi item nhận 1 số phiếu riêng', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 100, noiDung: 'a' },
      { loai: 'PHIEU_THU', ngay: '2026-01-02', soTien: 200, noiDung: 'b' },
    ] as any;

    const res = await service.importEntries(items, 'user-1');

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    const saved = chungTuRepo.save.mock.calls[0][0];
    const soPhieus = saved.map((x: any) => x.soPhieu);
    expect(new Set(soPhieus).size).toBe(2); // khác nhau
    expect(saved[0].nguoiTaoId).toBe('user-1');
  });

  it('gom theo loai và đặt dải số riêng từng loại', async () => {
    const { service, voucherNumberService, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 1, noiDung: 'a' },
      { loai: 'PHIEU_CHI', ngay: '2026-01-01', soTien: 2, noiDung: 'b' },
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 3, noiDung: 'c' },
    ] as any;

    await service.importEntries(items, 'u');

    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith(
      'PHIEU_THU',
      2,
      { maLoaiChungTu: undefined, date: expect.any(Date) },
    );
    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith(
      'PHIEU_CHI',
      1,
      { maLoaiChungTu: undefined, date: expect.any(Date) },
    );
    const saved = chungTuRepo.save.mock.calls[0][0];
    // item index 0 và 2 là PHIEU_THU → PT1, PT2; index 1 là PHIEU_CHI → PC1
    expect(saved[0].soPhieu).toBe('PT1');
    expect(saved[1].soPhieu).toBe('PC1');
    expect(saved[2].soPhieu).toBe('PT2');
  });

  it('mảng rỗng → trả về data rỗng, không lưu', async () => {
    const { service, chungTuRepo } = setup();
    const res = await service.importEntries([] as any, 'u');
    expect(res.data).toEqual([]);
    expect(chungTuRepo.save).not.toHaveBeenCalled();
  });

  it('gộp các dòng cùng nhomGop vào 1 số phiếu, header lấy dòng đầu', async () => {
    const { service, chungTuRepo, voucherNumberService } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 100, noiDung: 'd1', nguoiGiaoDich: 'A', nhomGop: 'HD1' },
      { loai: 'PHIEU_THU', ngay: '2026-01-09', soTien: 200, noiDung: 'd2', nguoiGiaoDich: 'B', nhomGop: 'HD1' },
      { loai: 'PHIEU_THU', ngay: '2026-01-03', soTien: 300, noiDung: 'd3' }, // không nhóm
    ] as any;

    const res = await service.importEntries(items, 'u');

    expect(res.data).toHaveLength(3); // vẫn 3 bản ghi
    const saved = chungTuRepo.save.mock.calls[0][0];
    const byNoiDung = Object.fromEntries(saved.map((x: any) => [x.noiDung, x]));
    // d1, d2 chung 1 số phiếu; d3 khác
    expect(byNoiDung.d1.soPhieu).toBe(byNoiDung.d2.soPhieu);
    expect(byNoiDung.d3.soPhieu).not.toBe(byNoiDung.d1.soPhieu);
    expect(new Set(saved.map((x: any) => x.soPhieu)).size).toBe(2); // 2 chứng từ
    // header lấy dòng đầu nhóm: d2 mượn ngay + nguoiGiaoDich của d1
    expect(byNoiDung.d2.nguoiGiaoDich).toBe('A');
    expect(byNoiDung.d2.ngay.getTime()).toBe(byNoiDung.d1.ngay.getTime());
    // hạch toán riêng từng dòng
    expect(byNoiDung.d2.soTien).toBe(200);
    // count = số NHÓM (2), không phải số dòng (3) — chặn bug cấp dư số phiếu
    expect(voucherNumberService.generateVoucherNumbers).toHaveBeenCalledWith(
      'PHIEU_THU',
      2,
      { maLoaiChungTu: undefined, date: expect.any(Date) },
    );
  });

  it('ngayGhiSo trống thì = ngày phát sinh của dòng đầu nhóm', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-02-05', soTien: 1, noiDung: 'x', nhomGop: 'G', ngayGhiSo: '2026-02-20' },
      { loai: 'PHIEU_THU', ngay: '2026-02-06', soTien: 2, noiDung: 'y', nhomGop: 'G' },
    ] as any;
    await service.importEntries(items, 'u');
    const saved = chungTuRepo.save.mock.calls[0][0];
    // cả nhóm dùng ngayGhiSo của dòng đầu (2026-02-20)
    saved.forEach((s: any) => expect(s.ngayGhiSo.getTime()).toBe(new Date('2026-02-20').getTime()));
  });

  it('hai nhóm khác nhau cùng loai → 2 số phiếu khác nhau', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-03-01', soTien: 1, noiDung: 'a1', nhomGop: 'A' },
      { loai: 'PHIEU_THU', ngay: '2026-03-01', soTien: 2, noiDung: 'a2', nhomGop: 'A' },
      { loai: 'PHIEU_THU', ngay: '2026-03-02', soTien: 3, noiDung: 'b1', nhomGop: 'B' },
      { loai: 'PHIEU_THU', ngay: '2026-03-02', soTien: 4, noiDung: 'b2', nhomGop: 'B' },
    ] as any;
    await service.importEntries(items, 'u');
    const saved = chungTuRepo.save.mock.calls[0][0];
    const byNd = Object.fromEntries(saved.map((x: any) => [x.noiDung, x]));
    expect(byNd.a1.soPhieu).toBe(byNd.a2.soPhieu);
    expect(byNd.b1.soPhieu).toBe(byNd.b2.soPhieu);
    expect(byNd.a1.soPhieu).not.toBe(byNd.b1.soPhieu);
    expect(new Set(saved.map((x: any) => x.soPhieu)).size).toBe(2);
  });
});
