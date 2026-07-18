import { softDeleteBatch } from './soft-delete-batch';

interface Row {
  _id: unknown;
  isActive?: boolean;
  trangThai?: string;
}

function makeRepo(rows: Row[]) {
  const saved: Row[] = [];
  const repo = {
    find: jest.fn(async () => rows),
    save: jest.fn(async (entities: Row[]) => {
      saved.push(...entities);
      return entities;
    }),
  };
  return { repo, saved };
}

describe('softDeleteBatch', () => {
  it('mảng rỗng → không gọi DB, trả 0/0', async () => {
    const { repo } = makeRepo([]);
    const result = await softDeleteBatch(repo as never, []);
    expect(result).toEqual({ deleted: 0, skipped: 0 });
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('xóa mềm tất cả bản ghi tìm thấy', async () => {
    const rows: Row[] = [{ _id: 1 }, { _id: 2 }, { _id: 3 }];
    const { repo, saved } = makeRepo(rows);

    const result = await softDeleteBatch(repo as never, [
      '64b000000000000000000001',
      '64b000000000000000000002',
      '64b000000000000000000003',
    ]);

    expect(result).toEqual({ deleted: 3, skipped: 0 });
    expect(saved).toHaveLength(3);
    expect(saved.every((r) => r.isActive === false)).toBe(true);
  });

  it('canDelete chặn dòng nào thì dòng đó vào skipped, phần còn lại vẫn xóa', async () => {
    const rows: Row[] = [
      { _id: 1, trangThai: 'NHAP' },
      { _id: 2, trangThai: 'DA_DUYET' },
      { _id: 3, trangThai: 'NHAP' },
    ];
    const { repo, saved } = makeRepo(rows);

    const result = await softDeleteBatch(
      repo as never,
      [
        '64b000000000000000000001',
        '64b000000000000000000002',
        '64b000000000000000000003',
      ],
      (e: Row) => e.trangThai !== 'DA_DUYET',
    );

    expect(result).toEqual({ deleted: 2, skipped: 1 });
    expect(saved.map((r) => r._id)).toEqual([1, 3]);
  });

  it('id không tồn tại (repo không trả về) → không tính vào deleted lẫn skipped', async () => {
    const { repo } = makeRepo([{ _id: 1 }]);
    const result = await softDeleteBatch(repo as never, [
      '64b000000000000000000001',
      '64b000000000000000000099',
    ]);
    expect(result).toEqual({ deleted: 1, skipped: 0 });
  });

  it('bỏ qua id sai định dạng ObjectId thay vì ném lỗi', async () => {
    const { repo } = makeRepo([{ _id: 1 }]);
    const result = await softDeleteBatch(repo as never, [
      '64b000000000000000000001',
      'khong-phai-objectid',
    ]);
    expect(result).toEqual({ deleted: 1, skipped: 0 });
  });
});
