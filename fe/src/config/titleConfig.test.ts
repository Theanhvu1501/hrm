import { describe, it, expect } from 'vitest';
import { buildTitleGlossary, titleKey, type TitleTermSpec } from './titleConfig';

const terms: TitleTermSpec[] = [
  { tk: 'chuDauTu', surface: 'nkc.colMa' },
  { tk: 'chuDauTu', surface: 'nkc.colTen' },
  { tk: 'duAn' }, // term không surface
];
const defaults: Record<string, string> = {
  [titleKey(terms[0])]: 'Mã CĐT',
  [titleKey(terms[1])]: 'CĐT',
  [titleKey(terms[2])]: 'Dự án',
};

describe('buildTitleGlossary', () => {
  it('ghi override surface KHÔNG set label (tránh che cột anh em)', () => {
    const g = buildTitleGlossary(undefined, terms, { [titleKey(terms[1])]: 'NTT' }, defaults);
    expect(g.chuDauTu.surfaces?.['nkc.colTen']).toBe('NTT');
    expect(g.chuDauTu.label).toBeUndefined();
    expect(g.chuDauTu.surfaces?.['nkc.colMa']).toBeUndefined();
  });

  it('giá trị bằng default hoặc rỗng → KHÔNG ghi (gỡ override)', () => {
    const base = { chuDauTu: { surfaces: { 'nkc.colTen': 'NTT' } } };
    const g = buildTitleGlossary(base, terms, { [titleKey(terms[1])]: 'CĐT' }, defaults); // = default
    expect(g.chuDauTu?.surfaces?.['nkc.colTen']).toBeUndefined();
    expect(g.chuDauTu).toBeUndefined(); // entry rỗng → xóa
  });

  it('term không surface → ghi label', () => {
    const g = buildTitleGlossary(undefined, terms, { [titleKey(terms[2])]: 'Công trình' }, defaults);
    expect(g.duAn.label).toBe('Công trình');
  });

  it('không thay đổi gì → glossary rỗng', () => {
    const g = buildTitleGlossary(undefined, terms, {}, defaults);
    expect(g).toEqual({});
  });
});
