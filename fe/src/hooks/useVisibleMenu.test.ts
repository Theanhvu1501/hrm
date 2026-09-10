import { describe, it, expect } from 'vitest';
import { locMuc, cacKhoaQuyen } from './useVisibleMenu';
import type { MenuLeaf } from '@/config/menuCatalog';

const muc = (key: string, extra: Partial<MenuLeaf> = {}): MenuLeaf => ({
  key, label: key, module: 'nhan-su', status: 'ok', ...extra,
});

describe('locMuc', () => {
  it('SuperAdmin thấy hết, bỏ qua quyền', () => {
    const ds = [muc('/nhan-su/ho-so-nhan-vien'), muc('/nhan-su/thoi-viec')];
    expect(locMuc(ds, () => false, true)).toHaveLength(2);
  });

  it('ẩn mục không có quyền xem', () => {
    const ds = [muc('/nhan-su/ho-so-nhan-vien'), muc('/nhan-su/thoi-viec')];
    const ra = locMuc(ds, (p) => p === '/nhan-su/ho-so-nhan-vien:xem', false);
    expect(ra.map((l) => l.key)).toEqual(['/nhan-su/ho-so-nhan-vien']);
  });

  it('mục soon vẫn hiện dù không có quyền', () => {
    const ds = [muc('/luong/bhxh', { module: 'luong', status: 'soon' })];
    expect(locMuc(ds, () => false, false)).toHaveLength(1);
  });

  it('mục luonHien hiện dù không có quyền (Chấm công của tôi)', () => {
    const ds = [muc('/cham-cong/cua-toi', { module: 'cham-cong', luonHien: true })];
    expect(locMuc(ds, () => false, false)).toHaveLength(1);
  });

  it('mục đi chung quyền trang khác xin quyền theo permKey', () => {
    const ds = [muc('/nhan-su/mau-in-hop-dong', { permKey: '/nhan-su/hop-dong-lao-dong' })];
    expect(locMuc(ds, (p) => p === '/nhan-su/hop-dong-lao-dong:xem', false)).toHaveLength(1);
    expect(locMuc(ds, (p) => p === '/nhan-su/mau-in-hop-dong:xem', false)).toHaveLength(0);
  });

  it('mục legacy không bao giờ hiện', () => {
    const ds = [muc('/nhan-su/cu', { legacy: true })];
    expect(locMuc(ds, () => true, false)).toEqual([]);
  });
});

describe('cacKhoaQuyen', () => {
  it('trả khoá :xem theo route', () => {
    expect(cacKhoaQuyen(muc('/cham-cong/bang-cong'))).toEqual(['/cham-cong/bang-cong:xem']);
  });

  it('mục có permKey xin quyền theo permKey', () => {
    expect(cacKhoaQuyen(muc('/a?tab=b', { permKey: '/a' }))).toEqual(['/a:xem']);
  });
});
