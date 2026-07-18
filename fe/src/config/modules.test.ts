import { describe, it, expect } from 'vitest';
import { isCommonKey, getAvailableModuleCodes } from './modules';

describe('isCommonKey', () => {
  it('mục dùng chung → true', () => {
    expect(isCommonKey('/')).toBe(true);
    expect(isCommonKey('/quy-trinh')).toBe(true);
    expect(isCommonKey('/huong-dan')).toBe(true);
    expect(isCommonKey('/chinh-sach')).toBe(true);
    expect(isCommonKey('/bieu-mau')).toBe(true);
  });

  it('khớp theo tiền tố con của mục chung', () => {
    expect(isCommonKey('/quy-trinh/chi-tiet')).toBe(true);
  });

  it('mục nghiệp vụ → false', () => {
    expect(isCommonKey('/bao-cao/tai-chinh')).toBe(false);
    expect(isCommonKey('/kho/nhap-kho')).toBe(false);
    expect(isCommonKey('/danh-muc/tai-khoan')).toBe(false);
  });
});

describe('getAvailableModuleCodes', () => {
  const ALL = ['KE_TOAN', 'KHO', 'BAN_HANG'];

  it('SuperAdmin thấy mọi code active', () => {
    expect(getAvailableModuleCodes(['KE_TOAN'], true, ALL)).toEqual(ALL);
  });

  it('user thường = giao tenantModules ∩ code active', () => {
    expect(getAvailableModuleCodes(['KE_TOAN', 'KHO'], false, ALL)).toEqual(['KE_TOAN', 'KHO']);
    expect(getAvailableModuleCodes(['KHO'], false, ALL)).toEqual(['KHO']);
  });

  it('loại code không còn active', () => {
    expect(getAvailableModuleCodes(['KE_TOAN', 'KHO'], false, ['KE_TOAN'])).toEqual(['KE_TOAN']);
  });

  it('thiếu/không hợp lệ → fallback KE_TOAN nếu active', () => {
    expect(getAvailableModuleCodes(undefined, false, ALL)).toEqual(['KE_TOAN']);
    expect(getAvailableModuleCodes([], false, ALL)).toEqual(['KE_TOAN']);
    expect(getAvailableModuleCodes(['XXX'], false, ALL)).toEqual(['KE_TOAN']);
  });

  it('fallback về code đầu tiên khi không có KE_TOAN', () => {
    expect(getAvailableModuleCodes(['XXX'], false, ['KHO', 'BAN_HANG'])).toEqual(['KHO']);
  });
});

import { unionMenuKeys } from './modules';

describe('unionMenuKeys', () => {
  it('gộp menuKeys nhiều phân hệ, loại trùng', () => {
    const result = unionMenuKeys([
      { menuKeys: ['/kho', '/chung-tu/phieu-nhap'] },
      { menuKeys: ['/chung-tu/phieu-nhap', '/bao-cao/ton-kho'] },
    ]);
    expect(result).toEqual(['/kho', '/chung-tu/phieu-nhap', '/bao-cao/ton-kho']);
  });

  it('danh sách rỗng → []', () => {
    expect(unionMenuKeys([])).toEqual([]);
  });

  it('phân hệ có menuKeys rỗng (vd KE_TOAN) → []', () => {
    expect(unionMenuKeys([{ menuKeys: [] }])).toEqual([]);
  });
});
