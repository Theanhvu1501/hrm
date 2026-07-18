import { describe, it, expect } from 'vitest';
import { matchAllFilters, type ColumnFilters } from '@/components/table/columnFilter';
import type { TaiKhoan } from '@/types';
import { getTaiKhoanValue, keepWithAncestors } from './taiKhoanTreeFilter';

const acc = (
  id: string,
  ma: string,
  ten: string,
  capDo: number,
  parentId?: string,
  moTa?: string,
): TaiKhoan => ({
  id,
  ma,
  ten,
  capDo,
  loai: 'TAI_SAN',
  nhom: 'NO',
  parentId,
  moTa,
});

// 111 (cha) → 1111, 1112 ; 112 (cha) → 1121
const data: TaiKhoan[] = [
  acc('a', '111', 'Tiền mặt', 1, undefined, 'Quỹ tiền mặt'),
  acc('a1', '1111', 'Tiền Việt Nam', 2, 'a'),
  acc('a2', '1112', 'Ngoại tệ', 2, 'a'),
  acc('b', '112', 'Tiền gửi ngân hàng', 1),
  acc('b1', '1121', 'Tiền Việt Nam', 2, 'b'),
];

const byFilters = (filters: ColumnFilters) => (a: TaiKhoan) =>
  matchAllFilters(a, filters, getTaiKhoanValue);

const mas = (rows: TaiKhoan[]) => rows.map((r) => r.ma);

describe('keepWithAncestors', () => {
  it('khớp TK con → giữ luôn TK cha để cây không vỡ', () => {
    const out = keepWithAncestors(data, byFilters({ ten: { kind: 'text', op: 'contains', value: 'ngoại tệ' } }));
    expect(mas(out)).toEqual(['111', '1112']);
  });

  it('bỏ dấu tiếng Việt khi so khớp (dùng chung matchText)', () => {
    const out = keepWithAncestors(data, byFilters({ ten: { kind: 'text', op: 'contains', value: 'ngoai te' } }));
    expect(mas(out)).toEqual(['111', '1112']);
  });

  it('khớp TK cha → KHÔNG kéo theo con không khớp', () => {
    const out = keepWithAncestors(data, byFilters({ ma: { kind: 'text', op: 'equals', value: '111' } }));
    expect(mas(out)).toEqual(['111']);
  });

  it('giữ nguyên thứ tự dòng của mảng nguồn (để sortHierarchy dựng lại cây)', () => {
    const out = keepWithAncestors(data, byFilters({ ten: { kind: 'text', op: 'contains', value: 'tiền việt nam' } }));
    expect(mas(out)).toEqual(['111', '1111', '112', '1121']); // 2 dòng khớp + 2 cha
  });

  it('lọc nhiều cột phải khớp đồng thời', () => {
    const out = keepWithAncestors(
      data,
      byFilters({
        ma: { kind: 'text', op: 'startsWith', value: '111' },
        ten: { kind: 'text', op: 'contains', value: 'ngoai' },
      }),
    );
    expect(mas(out)).toEqual(['111', '1112']);
  });

  it('cha không khớp vẫn được giữ làm dòng ngữ cảnh cho con khớp', () => {
    // "Không chứa 'tiền mặt'": 111 KHÔNG khớp, nhưng 3 TK con khớp → 111 vẫn hiện làm dòng cha.
    const out = keepWithAncestors(data, byFilters({ ten: { kind: 'text', op: 'notContains', value: 'tiền mặt' } }));
    expect(mas(out)).toEqual(['111', '1111', '1112', '112', '1121']);
  });

  it('không khớp gì → rỗng', () => {
    const out = keepWithAncestors(data, byFilters({ ma: { kind: 'text', op: 'contains', value: '999' } }));
    expect(out).toEqual([]);
  });

  it('không có bộ lọc nào → giữ toàn bộ', () => {
    const out = keepWithAncestors(data, byFilters({}));
    expect(out).toHaveLength(data.length);
  });

  it('parentId trỏ vòng (dữ liệu lỗi) → không treo', () => {
    const loop: TaiKhoan[] = [acc('x', '1', 'A', 1, 'y'), acc('y', '2', 'B', 1, 'x')];
    const out = keepWithAncestors(loop, byFilters({ ma: { kind: 'text', op: 'equals', value: '1' } }));
    expect(mas(out)).toEqual(['1', '2']);
  });
});
