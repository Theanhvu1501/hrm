import { describe, it, expect } from 'vitest';
import { CHI_TIET_LABEL, validateRows, type SoDuRow } from './chiTietConfig';

const base: SoDuRow = {
  key: '1', maTaiKhoan: '', tenTaiKhoan: '', chiTietTheo: undefined,
  chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined, duNo: 0, duCo: 0,
};

describe('CHI_TIET_LABEL', () => {
  it('co nhan cho tat ca loai', () => {
    expect(CHI_TIET_LABEL.KHACH_HANG).toBe('Khách hàng');
    expect(CHI_TIET_LABEL.NGAN_HANG_QUY).toBe('Ngân hàng & Quỹ');
  });
});

describe('validateRows', () => {
  it('bao loi khi TK trong', () => {
    const r = validateRows([{ ...base, maTaiKhoan: '' }]);
    expect(r.ok).toBe(false);
  });

  it('bao loi khi TK co chiTietTheo nhung chua chon doi tuong', () => {
    const r = validateRows([{ ...base, maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG' }]);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('đối tượng');
  });

  it('bao loi khi trung (TK + doi tuong)', () => {
    const rows: SoDuRow[] = [
      { ...base, key: '1', maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG', chiTietId: 'a' },
      { ...base, key: '2', maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG', chiTietId: 'a' },
    ];
    expect(validateRows(rows).ok).toBe(false);
  });

  it('hop le: TK khong chi tiet + TK chi tiet co doi tuong', () => {
    const rows: SoDuRow[] = [
      { ...base, key: '1', maTaiKhoan: '111', duNo: 100 },
      { ...base, key: '2', maTaiKhoan: '131', chiTietTheo: 'KHACH_HANG', chiTietId: 'a', duNo: 50 },
    ];
    expect(validateRows(rows).ok).toBe(true);
  });
});

describe('validateRows nganHang', () => {
  const row = (p: Partial<SoDuRow>): SoDuRow => ({
    key: Math.random().toString(),
    maTaiKhoan: '1111',
    tenTaiKhoan: 'TM',
    duNo: 0,
    duCo: 0,
    ...p,
  });

  it('cùng mã TK nhưng khác ngân hàng gõ tay → KHÔNG trùng', () => {
    const r = validateRows([
      row({ nganHang: 'VCB' }),
      row({ nganHang: 'ACB' }),
    ]);
    expect(r.ok).toBe(true);
  });

  it('cùng mã TK + cùng ngân hàng gõ tay → trùng', () => {
    const r = validateRows([
      row({ nganHang: 'VCB' }),
      row({ nganHang: 'VCB' }),
    ]);
    expect(r.ok).toBe(false);
  });
});
