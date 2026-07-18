import { describe, it, expect } from 'vitest';
import { buildSoDuTree } from './buildSoDuTree';
import type { SoDuRow } from './chiTietConfig';
import { collectVisibleRows, filterSoDuTree, soDuNodeText } from './soDuFilter';

const chart = [
  { ma: '111', ten: 'Tiền mặt' },
  { ma: '1111', ten: 'Tiền Việt Nam' },
  { ma: '131', ten: 'Phải thu khách hàng' },
];

const rows: SoDuRow[] = [
  { key: 'r1', maTaiKhoan: '1111', tenTaiKhoan: 'Tiền Việt Nam', duNo: 100, duCo: 0 },
  {
    key: 'r2', maTaiKhoan: '131', tenTaiKhoan: 'Phải thu khách hàng',
    chiTietTheo: 'KHACH_HANG', chiTietId: 'id1', chiTietMa: 'KH01', chiTietTen: 'Công ty A',
    duNo: 200, duCo: 0,
  },
  {
    key: 'r3', maTaiKhoan: '131', tenTaiKhoan: 'Phải thu khách hàng',
    chiTietTheo: 'KHACH_HANG', chiTietId: 'id2', chiTietMa: 'KH02', chiTietTen: 'Công ty B',
    duNo: 300, duCo: 0,
  },
];

const tree = buildSoDuTree(rows, chart);
const total = (nodes = tree) =>
  collectVisibleRows(nodes).reduce((s, r) => s + r.duNo, 0);

describe('soDuNodeText', () => {
  it('node TK: "mã - tên"; node đối tượng: "mã ĐT - tên ĐT"', () => {
    const tk131 = tree.find((n) => n.__ma === '131')!;
    expect(soDuNodeText(tk131)).toBe('131 - Phải thu khách hàng');
    expect(soDuNodeText(tk131.children![0])).toBe('KH01 - Công ty A');
  });
});

describe('filterSoDuTree', () => {
  it('không lọc → trả nguyên cây gốc', () => {
    expect(filterSoDuTree(tree, {})).toBe(tree);
    expect(filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: '' } })).toBe(tree);
  });

  it('khớp ở đối tượng → giữ TK cha, rollup cộng lại theo đối tượng còn hiện', () => {
    const out = filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: 'công ty a' } });

    expect(out.map((n) => n.__ma)).toEqual(['131']); // nhánh 111 bị bỏ
    const tk131 = out[0];
    expect(tk131.children!.map((c) => c.row!.chiTietMa)).toEqual(['KH01']);
    expect(tk131.__rollup.duNo).toBe(200); // KHÔNG còn là 500
    expect(total(out)).toBe(200);
  });

  it('bỏ dấu tiếng Việt khi so khớp', () => {
    const out = filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: 'cong ty b' } });
    expect(out[0].children!.map((c) => c.row!.chiTietMa)).toEqual(['KH02']);
    expect(out[0].__rollup.duNo).toBe(300);
  });

  it('khớp ở TK cha → giữ nguyên cả nhánh con (còn nhập được đối tượng)', () => {
    const out = filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: 'phải thu' } });
    expect(out).toHaveLength(1);
    expect(out[0].children).toHaveLength(2);
    expect(out[0].__rollup.duNo).toBe(500);
  });

  it('khớp TK mẹ → vẫn thấy TK con bên dưới', () => {
    const out = filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: 'tiền mặt' } });
    expect(out.map((n) => n.__ma)).toEqual(['111']);
    expect(out[0].children!.map((n) => n.__ma)).toEqual(['1111']);
    expect(total(out)).toBe(100);
  });

  it('không khớp gì → cây rỗng', () => {
    const out = filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: 'zzz' } });
    expect(out).toEqual([]);
    expect(total(out)).toBe(0);
  });

  it('không sửa cây gốc', () => {
    filterSoDuTree(tree, { tk: { kind: 'text', op: 'contains', value: 'công ty a' } });
    expect(tree.find((n) => n.__ma === '131')!.__rollup.duNo).toBe(500);
    expect(total()).toBe(600);
  });
});
