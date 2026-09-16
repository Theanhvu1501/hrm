import type { OrgUnit } from '@app/entities';
import { dungCay, duongDan, hauDue } from './cayToChuc';

function nut(over: Partial<OrgUnit> & { id: string }): OrgUnit {
  return {
    ten: over.id,
    loai: 'phong_ban',
    parentId: null,
    thuTu: 0,
    isActive: true,
    ...over,
  } as unknown as OrgUnit;
}

describe('dungCay', () => {
  it('xếp con vào đúng cha, sắp theo thuTu rồi tới tên', () => {
    const cay = dungCay([
      nut({ id: 'b', ten: 'Phòng B', parentId: 'k', thuTu: 2 }),
      nut({ id: 'a', ten: 'Phòng A', parentId: 'k', thuTu: 1 }),
      nut({ id: 'k', ten: 'Khối Vận hành', loai: 'khoi' }),
    ]);

    expect(cay).toHaveLength(1);
    expect(cay[0].ten).toBe('Khối Vận hành');
    expect(cay[0].con.map((c) => c.ten)).toStrictEqual(['Phòng A', 'Phòng B']);
  });

  it('cùng thuTu thì sắp theo tên tiếng Việt', () => {
    const cay = dungCay([
      nut({ id: '1', ten: 'Đào tạo' }),
      nut({ id: '2', ten: 'Bán hàng' }),
      nut({ id: '3', ten: 'Chăm sóc khách hàng' }),
    ]);
    expect(cay.map((n) => n.ten)).toStrictEqual([
      'Bán hàng',
      'Chăm sóc khách hàng',
      'Đào tạo',
    ]);
  });

  it('nút mồ côi (cha đã bị xoá tay dưới DB) được nâng lên gốc, KHÔNG biến mất', () => {
    const cay = dungCay([nut({ id: 'x', ten: 'Phòng lạc', parentId: 'khong-co' })]);
    expect(cay.map((n) => n.ten)).toStrictEqual(['Phòng lạc']);
  });

  it('nút tự trỏ vào chính nó không làm cây lặp vô hạn', () => {
    const cay = dungCay([nut({ id: 'x', ten: 'X', parentId: 'x' })]);
    expect(cay).toHaveLength(1);
    expect(cay[0].con).toStrictEqual([]);
  });

  it('parentId là chuỗi rỗng cũng là gốc', () => {
    const cay = dungCay([nut({ id: 'x', ten: 'X', parentId: '' })]);
    expect(cay).toHaveLength(1);
  });
});

describe('duongDan', () => {
  const ds = [
    nut({ id: 'k', ten: 'Khối Kinh doanh', loai: 'khoi' }),
    nut({ id: 'p', ten: 'Phòng Bán hàng', parentId: 'k' }),
    nut({ id: 'c', ten: 'Trưởng phòng', parentId: 'p', loai: 'chuc_danh' }),
  ];

  it('ghép từ gốc xuống lá', () => {
    expect(duongDan('c', ds)).toBe(
      'Khối Kinh doanh / Phòng Bán hàng / Trưởng phòng',
    );
  });

  it('nút gốc chỉ có tên của chính nó', () => {
    expect(duongDan('k', ds)).toBe('Khối Kinh doanh');
  });

  it('dữ liệu có chu trình vẫn dừng, không treo', () => {
    const vong = [
      nut({ id: 'a', ten: 'A', parentId: 'b' }),
      nut({ id: 'b', ten: 'B', parentId: 'a' }),
    ];
    expect(duongDan('a', vong)).toBe('B / A');
  });
});

describe('hauDue', () => {
  const ds = [
    nut({ id: 'k', ten: 'Khối' }),
    nut({ id: 'p1', ten: 'P1', parentId: 'k' }),
    nut({ id: 'p2', ten: 'P2', parentId: 'k' }),
    nut({ id: 'c1', ten: 'C1', parentId: 'p1' }),
  ];

  it('gồm cả chính nó và toàn bộ nhánh dưới', () => {
    expect([...hauDue('k', ds)].sort()).toStrictEqual(['c1', 'k', 'p1', 'p2']);
    expect([...hauDue('p1', ds)].sort()).toStrictEqual(['c1', 'p1']);
  });

  it('lá chỉ có chính nó', () => {
    expect([...hauDue('c1', ds)]).toStrictEqual(['c1']);
  });

  it('dữ liệu có chu trình không làm treo vòng lặp', () => {
    const vong = [
      nut({ id: 'a', ten: 'A', parentId: 'b' }),
      nut({ id: 'b', ten: 'B', parentId: 'a' }),
    ];
    expect([...hauDue('a', vong)].sort()).toStrictEqual(['a', 'b']);
  });
});
