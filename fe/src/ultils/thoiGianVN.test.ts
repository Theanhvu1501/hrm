import { describe, it, expect } from 'vitest';
import { gioVN, ngayGioVN, homNayVN } from './thoiGianVN';

describe('thoiGianVN', () => {
  it('gioVN đổi ISO sang giờ VN dạng HH:mm', () => {
    // 22/07/2026 01:05 UTC = 08:05 giờ VN
    expect(gioVN('2026-07-22T01:05:00.000Z')).toBe('08:05');
  });

  it('gioVN dùng múi giờ VN chứ không dùng giờ máy', () => {
    // 21/07/2026 17:00 UTC = 00:00 ngày 22 giờ VN
    expect(gioVN('2026-07-21T17:00:00.000Z')).toBe('00:00');
  });

  it('gioVN trả chuỗi rỗng khi không có giá trị', () => {
    expect(gioVN(undefined)).toBe('');
    expect(gioVN('')).toBe('');
  });

  it('ngayGioVN có cả ngày lẫn giờ', () => {
    const s = ngayGioVN('2026-07-22T01:05:00.000Z');
    expect(s).toContain('22');
    expect(s).toContain('08:05');
  });

  it('ngayGioVN trả chuỗi rỗng khi không có giá trị', () => {
    expect(ngayGioVN(undefined)).toBe('');
  });

  it('homNayVN trả về dạng YYYY-MM-DD', () => {
    expect(homNayVN()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
