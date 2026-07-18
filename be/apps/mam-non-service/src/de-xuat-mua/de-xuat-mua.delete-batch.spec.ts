import { DeXuatMuaService } from './de-xuat-mua.service';

type Row = { _id: unknown; trangThai: string; isActive?: boolean };

function makeService(rows: Row[]) {
  const saved: Row[] = [];
  const repo = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (entities: Row[]) => {
      saved.push(...entities);
      return entities;
    }),
  };
  // DeXuatMuaService(repo, sequence, tenantContext, serviceClient)
  const service = new DeXuatMuaService(
    repo as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );
  return { service, repo, saved };
}

describe('DeXuatMuaService.deleteBatch', () => {
  it('giữ nguyên guard của xóa đơn: đề xuất đã duyệt / đã nhận rơi vào skipped', async () => {
    const { service, saved } = makeService([
      { _id: 1, trangThai: 'NHAP' },
      { _id: 2, trangThai: 'DA_DUYET' },
      { _id: 3, trangThai: 'DA_NHAN' },
      { _id: 4, trangThai: 'CHO_DUYET' },
    ]);

    const result = await service.deleteBatch([
      '64b000000000000000000001',
      '64b000000000000000000002',
      '64b000000000000000000003',
      '64b000000000000000000004',
    ]);

    expect(result).toEqual({ deleted: 2, skipped: 2 });
    expect(saved.map((r) => r._id)).toEqual([1, 4]);
    expect(saved.every((r) => r.isActive === false)).toBe(true);
  });

  it('không ném lỗi khi cả lô đều bị chặn', async () => {
    const { service } = makeService([{ _id: 1, trangThai: 'DA_DUYET' }]);
    expect(await service.deleteBatch(['64b000000000000000000001'])).toEqual({
      deleted: 0,
      skipped: 1,
    });
  });

  it('danh sách rỗng → 0/0, không đụng DB', async () => {
    const { service, repo } = makeService([]);
    expect(await service.deleteBatch([])).toEqual({ deleted: 0, skipped: 0 });
    expect(repo.find).not.toHaveBeenCalled();
  });
});
