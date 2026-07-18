import { describe, it, expect } from 'vitest';
import { resolveTerm, TERM_REGISTRY } from './termRegistry';
import type { Glossary } from '@/types/tenant';

describe('resolveTerm', () => {
  const reg = TERM_REGISTRY;

  it('không có glossary nào → dùng registry (label + surface)', () => {
    expect(resolveTerm(undefined, undefined, reg, 'chuDauTu')).toBe('Chủ đầu tư');
    expect(resolveTerm(undefined, undefined, reg, 'chuDauTu', 'nkc.colTen')).toBe('CĐT');
    expect(resolveTerm(undefined, undefined, reg, 'chuDauTu', 'nkc.colMa')).toBe('Mã CĐT');
  });

  it('glossary công ty override label + surface (thắng tất cả)', () => {
    const g: Glossary = { chuDauTu: { label: 'Nhà tài trợ', surfaces: { 'nkc.colTen': 'NTT' } } };
    expect(resolveTerm(g, undefined, reg, 'chuDauTu')).toBe('Nhà tài trợ');
    expect(resolveTerm(g, undefined, reg, 'chuDauTu', 'nkc.colTen')).toBe('NTT');
  });

  it('nganh thắng registry khi tenant không có key', () => {
    const nganh: Glossary = { chuDauTu: { label: 'Khách hàng', surfaces: { 'nkc.colTen': 'KH' } } };
    expect(resolveTerm(undefined, nganh, reg, 'chuDauTu')).toBe('Khách hàng');
    expect(resolveTerm(undefined, nganh, reg, 'chuDauTu', 'nkc.colTen')).toBe('KH');
  });

  it('tenant thắng nganh khi tenant có key', () => {
    const tenant: Glossary = { chuDauTu: { label: 'Chủ nhà' } };
    const nganh: Glossary = { chuDauTu: { label: 'Khách hàng' } };
    expect(resolveTerm(tenant, nganh, reg, 'chuDauTu')).toBe('Chủ nhà');
  });

  it('tenant.label thắng nganh.surface khi tenant không có surface đó', () => {
    const tenant: Glossary = { chuDauTu: { label: 'Chủ nhà' } };
    const nganh: Glossary = { chuDauTu: { label: 'Khách hàng', surfaces: { 'nkc.colTen': 'KH' } } };
    expect(resolveTerm(tenant, nganh, reg, 'chuDauTu', 'nkc.colTen')).toBe('Chủ nhà');
  });

  it('key không có ở đâu → trả chính key', () => {
    expect(resolveTerm(undefined, undefined, reg, 'khongCo')).toBe('khongCo');
    expect(resolveTerm(undefined, undefined, reg, 'khongCo', 'x')).toBe('khongCo');
  });

  it('registry có các term cần dùng cho rollout NKC', () => {
    expect(TERM_REGISTRY.chuDauTu).toBeTruthy();
    expect(TERM_REGISTRY.duAn?.label).toBe('Dự án');
    expect(TERM_REGISTRY.doiTuong?.label).toBe('Đối tượng');
  });
});
