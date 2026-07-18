import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { initialPeriod, parseReportParams } from './reportParams';

function getterFrom(obj: Record<string, string>) {
  return (key: string) => (key in obj ? obj[key] : null);
}

describe('parseReportParams', () => {
  it('không có gì → object rỗng', () => {
    expect(parseReportParams(getterFrom({}))).toEqual({});
  });

  it('trích đủ TK, đối tượng, kỳ', () => {
    const parsed = parseReportParams(
      getterFrom({
        maTaiKhoan: '131',
        maDoiTuong: 'KH01',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z',
      }),
    );
    expect(parsed).toEqual({
      maTaiKhoan: '131',
      maDoiTuong: 'KH01',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T23:59:59.999Z',
    });
  });

  it('bỏ qua key rỗng', () => {
    const parsed = parseReportParams(getterFrom({ maTaiKhoan: '111', maDoiTuong: '' }));
    expect(parsed).toEqual({ maTaiKhoan: '111' });
    expect('maDoiTuong' in parsed).toBe(false);
  });
});

describe('initialPeriod', () => {
  it('không có param → tháng hiện tại, không có customRange', () => {
    const p = initialPeriod(getterFrom({}));
    expect(p.period).toBe(`thang${new Date().getMonth() + 1}`);
    expect(p.range[0].format('DD/MM/YYYY')).toBe(dayjs().startOf('month').format('DD/MM/YYYY'));
    expect(p.range[1].format('DD/MM/YYYY')).toBe(dayjs().endOf('month').format('DD/MM/YYYY'));
    expect(p.customRange).toBeUndefined();
  });

  it('có startDate/endDate (drill-down) → tuyChon + đúng khoảng ngày của link', () => {
    // Link drill-down mang ISO dựng từ giờ địa phương (như PeriodFilter làm), không phải giờ UTC.
    const p = initialPeriod(
      getterFrom({
        maTaiKhoan: '131',
        startDate: new Date(2024, 2, 1).toISOString(),
        endDate: new Date(2024, 2, 31, 23, 59, 59, 999).toISOString(),
      }),
    );
    expect(p.period).toBe('tuyChon');
    expect(p.range[0].format('DD/MM/YYYY')).toBe('01/03/2024');
    expect(p.range[1].format('DD/MM/YYYY')).toBe('31/03/2024');
    expect(p.customRange![0].format('DD/MM/YYYY')).toBe('01/03/2024');
  });

  it('ngày trên link không hợp lệ → quay về tháng hiện tại', () => {
    const p = initialPeriod(getterFrom({ startDate: 'khong-phai-ngay', endDate: 'xxx' }));
    expect(p.period).toBe(`thang${new Date().getMonth() + 1}`);
    expect(p.customRange).toBeUndefined();
  });
});
