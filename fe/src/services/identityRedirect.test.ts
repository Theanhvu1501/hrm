// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('redirectToIdentityLogin', () => {
  it('VITE_IDENTITY_URL set → set window.location.href và trả true', async () => {
    vi.stubEnv('VITE_IDENTITY_URL', 'http://localhost:3020');
    // Re-import sau khi stub env để module đọc lại biến
    vi.resetModules();
    const loc = { href: '' };
    vi.stubGlobal('location', loc);
    const { redirectToIdentityLogin } = await import('./identityRedirect');
    const result = redirectToIdentityLogin();
    expect(result).toBe(true);
    expect(loc.href).toBe('http://localhost:3020');
  });

  it('VITE_IDENTITY_URL không cấu hình → trả false, không redirect', async () => {
    // Đảm bảo env rỗng
    vi.unstubAllEnvs();
    vi.resetModules();
    const loc = { href: '' };
    vi.stubGlobal('location', loc);
    const { redirectToIdentityLogin } = await import('./identityRedirect');
    const result = redirectToIdentityLogin();
    expect(result).toBe(false);
    expect(loc.href).toBe('');
  });
});
