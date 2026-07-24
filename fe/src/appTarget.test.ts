import { describe, it, expect, vi, afterEach } from 'vitest';

describe('appTarget', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it('mặc định (không set VITE_APP_TARGET) là full, home = /', async () => {
    vi.stubEnv('VITE_APP_TARGET', '');
    vi.resetModules();
    const m = await import('./appTarget');
    expect(m.isChamCongApp).toBe(false);
    expect(m.getHomePath()).toBe('/');
  });

  it('VITE_APP_TARGET=cham-cong → isChamCongApp, home = /toi/cham-cong', async () => {
    vi.stubEnv('VITE_APP_TARGET', 'cham-cong');
    vi.resetModules();
    const m = await import('./appTarget');
    expect(m.isChamCongApp).toBe(true);
    expect(m.getHomePath()).toBe('/toi/cham-cong');
  });

  it('isNativeApp: false khi không có Capacitor', async () => {
    vi.resetModules();
    const m = await import('./appTarget');
    expect(m.isNativeApp()).toBe(false);
  });

  it('isNativeApp: true khi Capacitor.isNativePlatform() = true', async () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = {
      isNativePlatform: () => true,
    };
    vi.resetModules();
    const m = await import('./appTarget');
    expect(m.isNativeApp()).toBe(true);
  });
});
