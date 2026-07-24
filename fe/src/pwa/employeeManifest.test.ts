// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { applyManifestForPath } from './employeeManifest';

const APPLE = 'meta[name="apple-mobile-web-app-title"]';

function href() {
  return document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.getAttribute('href');
}
function appleTitle() {
  return document.querySelector<HTMLMetaElement>(APPLE)?.getAttribute('content');
}

describe('applyManifestForPath', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('trong /toi → manifest chấm công + apple title "Chấm công"', () => {
    applyManifestForPath('/toi/cham-cong');
    expect(href()).toBe('/manifest.chamcong.webmanifest');
    expect(appleTitle()).toBe('Chấm công');
  });

  it('ngoài /toi → manifest mặc định + apple title "Nhân sự"', () => {
    applyManifestForPath('/nhan-su/ho-so-nhan-vien');
    expect(href()).toBe('/manifest.webmanifest');
    expect(appleTitle()).toBe('Nhân sự');
  });

  it('tạo thẻ link mới khi document chưa có, không ném lỗi', () => {
    expect(document.querySelector('link[rel="manifest"]')).toBeNull();
    expect(() => applyManifestForPath('/toi')).not.toThrow();
    expect(href()).toBe('/manifest.chamcong.webmanifest');
  });

  it('idempotent: gọi hai lần không nhân đôi thẻ link/meta', () => {
    applyManifestForPath('/toi');
    applyManifestForPath('/toi');
    expect(document.querySelectorAll('link[rel="manifest"]').length).toBe(1);
    expect(document.querySelectorAll(APPLE).length).toBe(1);
  });

  it('tráo qua lại: /toi rồi / cập nhật đúng cùng thẻ', () => {
    applyManifestForPath('/toi');
    applyManifestForPath('/');
    expect(href()).toBe('/manifest.webmanifest');
    expect(appleTitle()).toBe('Nhân sự');
    expect(document.querySelectorAll('link[rel="manifest"]').length).toBe(1);
  });
});
