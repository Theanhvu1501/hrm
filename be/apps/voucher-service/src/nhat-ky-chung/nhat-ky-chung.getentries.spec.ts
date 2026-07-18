import 'reflect-metadata';
import { NhatKyChungService } from './nhat-ky-chung.service';

/**
 * Regression: meta.total phải lấy từ countDocuments (native Mongo filter),
 * KHÔNG dùng MongoRepository.count() — vốn diễn giải sai filter thô
 * (dotted path, $or, $gte/$lte) và trả về 0 dù có dữ liệu.
 */
describe('NhatKyChungService.getEntries — meta.total', () => {
  const makeRepo = (items: unknown[]) => ({
    aggregate: jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue(items),
    })),
    // Mô phỏng lỗi thực tế: count() trả 0, countDocuments() trả số đúng.
    count: jest.fn().mockResolvedValue(0),
    countDocuments: jest.fn().mockResolvedValue(items.length),
  });

  const tenantContext = { getCurrentTenantId: jest.fn().mockReturnValue('t1') };

  it('meta.total phản ánh đúng số bản ghi (dùng countDocuments)', async () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ _id: `id${i}` }));
    const repo = makeRepo(items);
    const service = new NhatKyChungService(
      repo as never,
      {} as never,
      tenantContext as never,
      {} as never,
    );

    const res = await service.getEntries({ page: 1, limit: 100 });

    expect(res.meta.total).toBe(7);
    expect(res.meta.totalPages).toBe(1);
    expect(repo.countDocuments).toHaveBeenCalledTimes(1);
  });
});
