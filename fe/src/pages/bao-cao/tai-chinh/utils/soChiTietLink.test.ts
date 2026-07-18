import { describe, it, expect } from 'vitest';
import { buildSoChiTietUrl } from './soChiTietLink';

describe('buildSoChiTietUrl', () => {
  it('chỉ TK → chỉ có maTaiKhoan', () => {
    const url = buildSoChiTietUrl({ maTaiKhoan: '111' });
    expect(url).toBe('/bao-cao/so-chi-tiet-tai-khoan?maTaiKhoan=111');
  });

  it('có đối tượng và kỳ → đủ tham số', () => {
    const url = buildSoChiTietUrl({
      maTaiKhoan: '131',
      maDoiTuong: 'KH01',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T23:59:59.999Z',
    });
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(url.startsWith('/bao-cao/so-chi-tiet-tai-khoan?')).toBe(true);
    expect(qs.get('maTaiKhoan')).toBe('131');
    expect(qs.get('maDoiTuong')).toBe('KH01');
    expect(qs.get('startDate')).toBe('2026-01-01T00:00:00.000Z');
    expect(qs.get('endDate')).toBe('2026-01-31T23:59:59.999Z');
  });

  it('bỏ qua maDoiTuong/ngày khi rỗng', () => {
    const url = buildSoChiTietUrl({ maTaiKhoan: '111', maDoiTuong: '', startDate: '' });
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.has('maDoiTuong')).toBe(false);
    expect(qs.has('startDate')).toBe(false);
  });
});
