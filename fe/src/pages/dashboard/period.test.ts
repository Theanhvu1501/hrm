import { describe, it, expect } from 'vitest';
import { resolvePeriod, sliceToRange, periodDateRange, PERIOD_OPTIONS } from './period';

describe('resolvePeriod', () => {
  it('tháng cụ thể', () => {
    expect(resolvePeriod('thang3', 2026)).toEqual({ year: 2026, startMonth: 3, endMonth: 3 });
  });
  it('quý', () => {
    expect(resolvePeriod('quy2', 2026)).toEqual({ year: 2026, startMonth: 4, endMonth: 6 });
  });
  it('nửa đầu / nửa cuối', () => {
    expect(resolvePeriod('nuaDau', 2026)).toEqual({ year: 2026, startMonth: 1, endMonth: 6 });
    expect(resolvePeriod('nuaCuoi', 2026)).toEqual({ year: 2026, startMonth: 7, endMonth: 12 });
  });
  it('năm nay / năm trước', () => {
    expect(resolvePeriod('namNay', 2026)).toEqual({ year: 2026, startMonth: 1, endMonth: 12 });
    expect(resolvePeriod('namTruoc', 2026)).toEqual({ year: 2025, startMonth: 1, endMonth: 12 });
  });
});

describe('PERIOD_OPTIONS', () => {
  it('có đủ 20 mục, mở đầu Tháng 1, kết Năm trước', () => {
    expect(PERIOD_OPTIONS).toHaveLength(20);
    expect(PERIOD_OPTIONS[0]).toEqual({ label: 'Tháng 1', value: 'thang1' });
    expect(PERIOD_OPTIONS[19]).toEqual({ label: 'Năm trước', value: 'namTruoc' });
  });
});

describe('sliceToRange', () => {
  const s = Array.from({ length: 12 }, (_, i) => ({ thang: i + 1, v: i + 1 }));
  it('cắt theo [startMonth,endMonth]', () => {
    expect(sliceToRange(s, 4, 6).map((x) => x.thang)).toEqual([4, 5, 6]);
    expect(sliceToRange(s, 3, 3).map((x) => x.thang)).toEqual([3]);
  });
});

describe('periodDateRange', () => {
  it('start = đầu tháng start, end = cuối tháng end', () => {
    const { start, end } = periodDateRange({ year: 2026, startMonth: 2, endMonth: 4 });
    expect(start.startsWith('2026-0')).toBe(true);
    expect(new Date(end).getMonth()).toBe(3); // tháng 4 (0-based 3)
    expect(new Date(start).getMonth()).toBe(1); // tháng 2
  });
});
