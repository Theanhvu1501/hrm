import { BoPhanService } from './bo-phan.service';

function makeService(rows: { _id: unknown; isActive?: boolean }[]) {
  const saved: { _id: unknown; isActive?: boolean }[] = [];
  const repo = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (entities: { _id: unknown; isActive?: boolean }[]) => {
      saved.push(...entities);
      return entities;
    }),
  };
  // BoPhanService(boPhanRepository, tenantContext) — tenantContext không dùng trong deleteBatch
  const tenantContext = { getCurrentTenantId: jest.fn(() => undefined) };
  const service = new BoPhanService(repo as never, tenantContext as never);
  return { service, repo, saved };
}

describe('BoPhanService.deleteBatch', () => {
  it('xóa mềm tất cả id gửi lên', async () => {
    const { service, saved } = makeService([{ _id: 1 }, { _id: 2 }]);

    const result = await service.deleteBatch([
      '64b000000000000000000001',
      '64b000000000000000000002',
    ]);

    expect(result).toEqual({ deleted: 2, skipped: 0 });
    expect(saved.every((r) => r.isActive === false)).toBe(true);
  });

  it('danh sách rỗng → 0/0, không đụng DB', async () => {
    const { service, repo } = makeService([]);
    expect(await service.deleteBatch([])).toEqual({ deleted: 0, skipped: 0 });
    expect(repo.find).not.toHaveBeenCalled();
  });
});
