// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// --- Mocks: nguồn phiên (identity) + storage, để quan sát tenant nào được refresh ---
const stored = { current: { tenantId: 'X' } as { tenantId: string } | null };
vi.mock('@/services/base/service-base', () => ({
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
  clearAuthToken: vi.fn(),
  setCurrentTenant: vi.fn(),
  getCurrentTenant: vi.fn(() => stored.current),
  clearCurrentTenant: vi.fn(() => { stored.current = null; }),
}));

const refreshFromIdentity = vi.fn(async (_tenantId: string) => null);
vi.mock('@/services/identitySession', () => ({
  refreshFromIdentity: (t: string) => refreshFromIdentity(t),
  decodeTenantId: (token: string | null) => {
    if (!token) return null;
    try { return JSON.parse(atob(token.split('.')[1]))?.tenantId ?? null; } catch { return null; }
  },
  isIdentityConfigured: () => true,
}));

const redirectToIdentityLogin = vi.fn(() => true);
vi.mock('@/services/identityRedirect', () => ({
  redirectToIdentityLogin: () => redirectToIdentityLogin(),
}));

vi.mock('@/services/authService', () => ({ authService: { getMe: vi.fn(), login: vi.fn() } }));
vi.mock('@/services/linhVucService', () => ({ linhVucService: { getAll: vi.fn(async () => []) } }));

import { AuthProvider } from './AuthContext';

function setUrl(search: string) {
  window.history.replaceState({}, '', `/dashboard${search}`);
}

beforeEach(() => {
  refreshFromIdentity.mockClear();
  redirectToIdentityLogin.mockClear();
  stored.current = { tenantId: 'X' }; // phiên cũ còn trong localStorage
});
afterEach(() => setUrl(''));

describe('AuthProvider SSO handoff', () => {
  it('ưu tiên tenant từ ?tenant (Portal) hơn currentTenant cũ trong localStorage', async () => {
    // User ở Portal chọn công ty B, redirect về ke-toan?tenant=B.
    // localStorage còn currentTenant=X của lần trước. Handoff B PHẢI thắng.
    setUrl('?tenant=B');
    // ssoHandoff (thật) sẽ fetch /api/refresh — cho fail để đơn giản, không ảnh hưởng intent.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));

    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => expect(refreshFromIdentity).toHaveBeenCalled());
    // Bug cũ: gọi với 'X' (tenant cũ) → user không vào được B → vòng lặp về chọn app.
    expect(refreshFromIdentity).toHaveBeenCalledWith('B');
    expect(refreshFromIdentity).not.toHaveBeenCalledWith('X');
  });
});
