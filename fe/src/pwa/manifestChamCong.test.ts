import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('manifest.chamcong.webmanifest', () => {
  const raw = readFileSync(
    path.resolve(__dirname, '../../public/manifest.chamcong.webmanifest'),
    'utf-8',
  );
  const manifest = JSON.parse(raw);

  it('là JSON hợp lệ với đúng danh tính app chấm công', () => {
    expect(manifest.name).toBe('Chấm công');
    expect(manifest.id).toBe('/toi');
    expect(manifest.start_url).toBe('/toi/cham-cong');
    expect(manifest.scope).toBe('/toi');
    expect(manifest.display).toBe('standalone');
  });

  it('dùng lại icon PWA hiện có', () => {
    const srcs = manifest.icons.map((i: { src: string }) => i.src);
    expect(srcs).toContain('/pwa-192x192.png');
    expect(srcs).toContain('/pwa-512x512.png');
  });
});
