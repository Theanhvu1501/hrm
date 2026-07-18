import 'reflect-metadata';
import { VoucherNumberService } from './voucher-number.service';

function makeRepoMock(initial?: { loai: string; year: number; lastSequence: number }) {
  let record = initial ? { ...initial } : null;
  return {
    findOne: jest.fn(async () => (record ? { ...record } : null)),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (entity: any) => {
      record = { ...entity };
      return record;
    }),
    _get: () => record,
  };
}

describe('VoucherNumberService.generateVoucherNumbers', () => {
  const year = new Date().getFullYear();

  it('trả về dải số liên tiếp khi chưa có sequence', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_THU', 3);

    expect(result).toEqual([
      `PT001/${year}`,
      `PT002/${year}`,
      `PT003/${year}`,
    ]);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo._get().lastSequence).toBe(3);
  });

  it('tiếp tục từ lastSequence hiện có', async () => {
    const repo = makeRepoMock({ loai: 'PHIEU_CHI', year, lastSequence: 5 });
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_CHI', 2);

    expect(result).toEqual([`PC006/${year}`, `PC007/${year}`]);
    expect(repo._get().lastSequence).toBe(7);
  });

  it('count = 0 trả về mảng rỗng, không ghi DB', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_THU', 0);

    expect(result).toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('có mã loại chứng từ → tiền tố theo mã + năm + tháng, số reset theo tháng', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);
    const date = new Date('2026-06-15T00:00:00Z');

    const result = await service.generateVoucherNumbers('KHAC', 2, {
      maLoaiChungTu: 'BH',
      date,
    });

    expect(result).toEqual(['BH202606/001', 'BH202606/002']);
    // Khoá đếm theo (mã, năm, tháng)
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { loai: 'BH', year: 2026, thang: 6 },
    });
    expect(repo._get().lastSequence).toBe(2);
  });

  it('generateVoucherNumber đơn lẻ theo mã loại chứng từ', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumber('PHIEU_THU', {
      maLoaiChungTu: 'PT',
      date: new Date('2026-12-01T00:00:00Z'),
    });

    expect(result).toBe('PT202612/001');
  });
});
