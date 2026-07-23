// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * Finding 3 — `AuthContext.logout` ĐÃ tự POST `/api/logout` sang identity từ
 * trước nhánh này. Cái còn thiếu là ĐÍCH HẠ CÁNH: nhân viên bị đưa về
 * masterceo.com.vn, đúng chặng đường vòng qua Portal mà đợt này sinh ra để
 * xoá.
 *
 * Ở đây kiểm cả hai chiều, vì tham số `dichDen` phải là bổ sung tương thích
 * ngược: có truyền → về đó; không truyền → về Portal y như cũ (khu quản trị
 * không được đổi hành vi).
 */

vi.mock('@/services/base/service-base', () => ({
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
  clearAuthToken: vi.fn(),
  setCurrentTenant: vi.fn(),
  getCurrentTenant: vi.fn(() => null),
  clearCurrentTenant: vi.fn(),
}));
vi.mock('@/services/identitySession', () => ({
  refreshFromIdentity: vi.fn(async () => null),
  decodeTenantId: () => null,
  isIdentityConfigured: () => false,
}));
vi.mock('@/services/identityRedirect', () => ({
  redirectToIdentityLogin: () => false,
}));
const logoutBE = vi.fn(async () => undefined);
vi.mock('@/services/authService', () => ({
  authService: { getMe: vi.fn(), login: vi.fn(), logout: () => logoutBE() },
}));
vi.mock('@/services/linhVucService', () => ({
  linhVucService: { getAll: vi.fn(async () => []) },
}));

import { AuthProvider, useAuth } from './AuthContext';

const PORTAL = 'https://portal.test';

function NutDangXuat({ dichDen }: { dichDen?: string }) {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={() => logout(dichDen)}>
      Đăng xuất
    </button>
  );
}

let loc: { href: string; pathname: string; search: string };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('VITE_IDENTITY_URL', PORTAL);
  loc = { href: '', pathname: '/cau-hinh/vai-tro', search: '' };
  vi.stubGlobal('location', loc);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal('fetch', fetchMock);
  logoutBE.mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function ve(dichDen?: string) {
  return render(
    <AuthProvider>
      <NutDangXuat dichDen={dichDen} />
    </AuthProvider>
  );
}

describe('AuthContext.logout — đích hạ cánh', () => {
  it('không truyền dichDen (khu quản trị) → vẫn về Portal, giữ nguyên hành vi cũ', async () => {
    ve();
    fireEvent.click(screen.getByText('Đăng xuất'));

    await waitFor(() => expect(loc.href).toBe(PORTAL));
  });

  it('truyền "/toi/login" (vỏ nhân viên) → hạ cánh ở /toi/login, KHÔNG ghé Portal', async () => {
    ve('/toi/login');
    fireEvent.click(screen.getByText('Đăng xuất'));

    await waitFor(() => expect(loc.href).toBe('/toi/login'));
    expect(loc.href).not.toBe(PORTAL);
  });

  /**
   * Đích đổi nhưng phiên identity vẫn PHẢI bị đóng — nếu không, "đăng xuất"
   * trên máy mượn chỉ là xoá token cục bộ, mở lại là vào thẳng.
   */
  it('đổi đích không được làm mất bước đóng phiên identity', async () => {
    ve('/toi/login');
    fireEvent.click(screen.getByText('Đăng xuất'));

    await waitFor(() => expect(loc.href).toBe('/toi/login'));
    const goiLogout = fetchMock.mock.calls.filter((c) =>
      String(c[0]).endsWith('/api/logout')
    );
    expect(goiLogout).toHaveLength(1);
    expect((goiLogout[0][1] as RequestInit).method).toBe('POST');
    expect((goiLogout[0][1] as RequestInit).credentials).toBe('include');
  });
});
