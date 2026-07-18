import { describe, it, expect } from 'vitest';
import { buildAccountTree, collectParentKeys, attachDoiTuongChildren, type TreeNode } from './buildAccountTree';

interface Row {
  ma: string;
  ten: string;
  val: number;
}

const chart = [
  { ma: '112', ten: 'Tiền gửi NH' },
  { ma: '1121', ten: 'VND' },
  { ma: '11211', ten: 'VCB' },
  { ma: '113', ten: 'Tiền đang chuyển' },
  { ma: '131', ten: 'Phải thu KH' },
];

const make = (a: { ma: string; ten: string }): Row => ({ ma: a.ma, ten: a.ten, val: 0 });

describe('buildAccountTree', () => {
  it('lồng đa cấp theo prefix và roll-up tổng con cháu', () => {
    const rows: Row[] = [
      { ma: '112', ten: 'Tiền gửi NH', val: 50 },
      { ma: '11211', ten: 'VCB', val: 200 },
    ];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);

    // root duy nhất là 112 (113/131 không có dữ liệu → bị cắt)
    expect(tree).toHaveLength(1);
    const n112 = tree[0];
    expect(n112.__ma).toBe('112');
    expect(n112.__isParent).toBe(true);
    expect(n112.val).toBe(50);          // giá trị riêng của 112
    expect(n112.__rollup.val).toBe(200); // tổng con cháu (11211)

    // 112 → 1121 (synthesized, không có report row) → 11211
    expect(n112.children).toHaveLength(1);
    const n1121 = n112.children![0];
    expect(n1121.__ma).toBe('1121');
    expect(n1121.val).toBe(0);           // synthesized → 0
    expect(n1121.ten).toBe('VND'); // synthesized node lấy tên từ chart
    expect(n1121.__rollup.val).toBe(200);
    expect(n1121.children![0].__ma).toBe('11211');
    expect(n1121.children![0].__isParent).toBe(false);
    expect(n1121.children![0].val).toBe(200);
  });

  it('cắt nhánh không có dữ liệu', () => {
    const rows: Row[] = [{ ma: '131', ten: 'Phải thu KH', val: 10 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    expect(tree.map((n) => n.__ma)).toEqual(['131']);
    expect(tree[0].__isParent).toBe(false);
  });

  it('mã lạ không có trong chart → node gốc đơn lẻ', () => {
    const rows: Row[] = [{ ma: '999', ten: 'Lạ', val: 7 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    expect(tree).toHaveLength(1);
    expect(tree[0].__ma).toBe('999');
    expect(tree[0].__isParent).toBe(false);
  });

  it('report rỗng → []', () => {
    expect(buildAccountTree([], chart, (r: Row) => r.ma, ['val'], make)).toEqual([]);
  });

  it('collectParentKeys gom đúng các mã node cha', () => {
    const rows: Row[] = [
      { ma: '112', ten: 'x', val: 1 },
      { ma: '11211', ten: 'y', val: 2 },
    ];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    expect(collectParentKeys(tree).sort()).toEqual(['112', '1121']);
  });
});

describe('attachDoiTuongChildren', () => {
  const makeDtNode = (code: string, dtMa: string, val: number): TreeNode<Row> => ({
    ma: '', ten: `${dtMa} - Tên`, val,
    __ma: `${code}::${dtMa}`, __isParent: false, __isDoiTuong: true, __rollup: { val: 0 },
  });

  it('gắn đối tượng làm con, giữ nguyên giá trị TK cha, không cộng vào rollup', () => {
    const rows: Row[] = [{ ma: '131', ten: 'Phải thu KH', val: 500 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    const childrenByCode = new Map<string, TreeNode<Row>[]>([
      ['131', [makeDtNode('131', 'KH01', 300), makeDtNode('131', 'KH02', 200)]],
    ]);
    attachDoiTuongChildren(tree, childrenByCode);

    const n131 = tree[0];
    expect(n131.__ma).toBe('131');
    expect(n131.__isParent).toBe(true);
    expect(n131.val).toBe(500);            // giá trị TK cha không đổi
    expect(n131.__rollup.val).toBe(0);     // đối tượng KHÔNG vào rollup
    expect(n131.children).toHaveLength(2);
    expect(n131.children![0].__isDoiTuong).toBe(true);
    // collectParentKeys gom được TK có đối tượng (cho nút "Mở tất cả")
    expect(collectParentKeys(tree)).toContain('131');
  });

  it('node không có trong map → không đổi', () => {
    const rows: Row[] = [{ ma: '131', ten: 'x', val: 10 }];
    const tree = buildAccountTree(rows, chart, (r) => r.ma, ['val'], make);
    attachDoiTuongChildren(tree, new Map());
    expect(tree[0].__isParent).toBe(false);
    expect(tree[0].children).toBeUndefined();
  });
});
