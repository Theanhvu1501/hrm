import { describe, it, expect } from 'vitest';
import { buildSoDuTree, collectExpandKeys } from './buildSoDuTree';
import type { SoDuRow } from './chiTietConfig';

const chart = [
  { ma: '1', ten: 'Tiền' },
  { ma: '11', ten: 'Tiền mặt' },
  { ma: '111', ten: 'Tiền mặt' },
  { ma: '1111', ten: 'TM VND' },
  { ma: '112', ten: 'Tiền gửi NH' },
  { ma: '1121', ten: 'TGNH VND' },
  { ma: '131', ten: 'Phải thu KH' },
];

const row = (p: Partial<SoDuRow>): SoDuRow => ({
  key: p.key ?? Math.random().toString(),
  maTaiKhoan: p.maTaiKhoan ?? '',
  tenTaiKhoan: '',
  duNo: 0,
  duCo: 0,
  ...p,
});

describe('buildSoDuTree', () => {
  it('TK lá thường → cây sinh cha tự động, lá nhập trực tiếp, roll-up lên cha', () => {
    const rows = [row({ key: 'a', maTaiKhoan: '1111', duNo: 100, duCo: 0 })];
    const tree = buildSoDuTree(rows, chart);

    expect(tree).toHaveLength(1);
    const n1 = tree[0];
    expect(n1.__ma).toBe('1');
    expect(n1.__isParent).toBe(true);
    expect(n1.__rollup.duNo).toBe(100);

    const n11 = n1.children![0];
    const n111 = n11.children![0];
    const n1111 = n111.children![0];
    expect(n1111.__ma).toBe('1111');
    expect(n1111.__isParent).toBe(false);
    expect(n1111.kind).toBe('account');
    expect(n1111.row?.key).toBe('a');
  });

  it('TK lá có đối tượng (ngân hàng) → node nhóm read-only, con là các đối tượng', () => {
    const rows = [
      row({ key: 'b1', maTaiKhoan: '1121', chiTietTheo: 'NGAN_HANG_QUY', chiTietId: 'vcb', duNo: 100 }),
      row({ key: 'b2', maTaiKhoan: '1121', chiTietTheo: 'NGAN_HANG_QUY', chiTietId: 'acb', duNo: 50 }),
    ];
    const tree = buildSoDuTree(rows, chart);

    // 1 → 11 → 112 → 1121 (cây sinh đủ cha theo prefix, giống báo cáo)
    const n1121 = tree[0].children![0].children![0].children![0];
    expect(n1121.__ma).toBe('1121');
    expect(n1121.__isParent).toBe(true);
    expect(n1121.chiTietTheo).toBe('NGAN_HANG_QUY');
    expect(n1121.__rollup.duNo).toBe(150);
    expect(n1121.children).toHaveLength(2);
    expect(n1121.children![0].kind).toBe('object');
    expect(n1121.children![0].__isParent).toBe(false);
  });

  it('nhiều TK con chung cha tự sinh', () => {
    const rows = [
      row({ key: 'c', maTaiKhoan: '1111', duNo: 10 }),
      row({ key: 'd', maTaiKhoan: '1121', chiTietTheo: 'NGAN_HANG_QUY', chiTietId: 'vcb', duNo: 20 }),
    ];
    const tree = buildSoDuTree(rows, chart);
    expect(tree).toHaveLength(1);
    expect(tree[0].__ma).toBe('1');
    expect(tree[0].__rollup.duNo).toBe(30);
  });

  it('collectExpandKeys gom mọi node có con', () => {
    const rows = [row({ key: 'e', maTaiKhoan: '1111', duNo: 10 })];
    const tree = buildSoDuTree(rows, chart);
    const keys = collectExpandKeys(tree);
    expect(keys).toEqual(['acc:1', 'acc:11', 'acc:111']);
  });
});
