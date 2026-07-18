export type DashboardPeriod =
  | 'thang1' | 'thang2' | 'thang3' | 'thang4' | 'thang5' | 'thang6'
  | 'thang7' | 'thang8' | 'thang9' | 'thang10' | 'thang11' | 'thang12'
  | 'quy1' | 'quy2' | 'quy3' | 'quy4'
  | 'nuaDau' | 'nuaCuoi' | 'namNay' | 'namTruoc';

export const PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[] = [
  ...Array.from({ length: 12 }, (_, i) => ({ label: `Tháng ${i + 1}`, value: `thang${i + 1}` as DashboardPeriod })),
  { label: 'Quý 1', value: 'quy1' },
  { label: 'Quý 2', value: 'quy2' },
  { label: 'Quý 3', value: 'quy3' },
  { label: 'Quý 4', value: 'quy4' },
  { label: '6 tháng đầu năm', value: 'nuaDau' },
  { label: '6 tháng cuối năm', value: 'nuaCuoi' },
  { label: 'Năm nay', value: 'namNay' },
  { label: 'Năm trước', value: 'namTruoc' },
];

export function resolvePeriod(
  period: DashboardPeriod,
  currentYear: number,
): { year: number; startMonth: number; endMonth: number } {
  if (period.startsWith('thang')) {
    const m = Number(period.slice(5));
    return { year: currentYear, startMonth: m, endMonth: m };
  }
  if (period.startsWith('quy')) {
    const q = Number(period.slice(3));
    return { year: currentYear, startMonth: q * 3 - 2, endMonth: q * 3 };
  }
  switch (period) {
    case 'nuaDau': return { year: currentYear, startMonth: 1, endMonth: 6 };
    case 'nuaCuoi': return { year: currentYear, startMonth: 7, endMonth: 12 };
    case 'namTruoc': return { year: currentYear - 1, startMonth: 1, endMonth: 12 };
    case 'namNay':
    default: return { year: currentYear, startMonth: 1, endMonth: 12 };
  }
}

export function periodDateRange(r: { year: number; startMonth: number; endMonth: number }): {
  start: string;
  end: string;
} {
  const start = new Date(r.year, r.startMonth - 1, 1);
  const end = new Date(r.year, r.endMonth, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function sliceToRange<T extends { thang: number }>(
  series: T[],
  startMonth: number,
  endMonth: number,
): T[] {
  return series.filter((p) => p.thang >= startMonth && p.thang <= endMonth);
}
