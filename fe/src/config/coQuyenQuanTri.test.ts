import { describe, it, expect } from 'vitest';
import { coQuyenQuanTri } from './coQuyenQuanTri';
import { routePermissions } from './routePermissions';

describe('coQuyenQuanTri', () => {
  it('có ít nhất một quyền quản trị → true', () => {
    const co = coQuyenQuanTri((q) => q === '/cham-cong/ban-ghi:xem');
    expect(co).toBe(true);
  });

  it('không có quyền nào → false', () => {
    expect(coQuyenQuanTri(() => false)).toBe(false);
  });

  /**
   * Nhân viên thường có thể mang quyền không nằm trong routePermissions
   * (quyền của app khác, hoặc quyền cũ). Những quyền đó KHÔNG được tính là
   * quyền quản trị của app này — nếu tính, cả công ty sẽ bị đẩy vào khu
   * quản trị và không ai vào được màn chấm công.
   */
  it('chỉ có quyền lạ ngoài routePermissions → false', () => {
    expect(coQuyenQuanTri((q) => q === '/ke-toan/phieu-thu:xem')).toBe(false);
  });

  it('đường chấm công tự phục vụ cố ý không nằm trong routePermissions', () => {
    expect(Object.keys(routePermissions)).not.toContain('/cham-cong/cua-toi');
    expect(Object.keys(routePermissions)).not.toContain('/toi');
  });
});
