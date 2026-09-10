/**
 * Bù `localStorage` cho môi trường test.
 *
 * Node từ bản 22 có sẵn một global `localStorage` THỰC NGHIỆM, và nó CHE mất
 * bản của jsdom. Không chạy kèm `--localstorage-file` thì global đó là
 * `undefined`, nên mọi test đụng tới localStorage đều nổ
 * "Cannot read properties of undefined" dù đã khai `@vitest-environment jsdom`.
 *
 * Ở đây cài một bản trong bộ nhớ khi thiếu. Mã chạy thật không dùng tới file
 * này — trình duyệt luôn có localStorage thật.
 */
class BoNhoTam implements Storage {
  private kho = new Map<string, string>();

  get length(): number {
    return this.kho.size;
  }

  clear(): void {
    this.kho.clear();
  }

  getItem(key: string): string | null {
    return this.kho.has(key) ? this.kho.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.kho.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.kho.delete(key);
  }

  setItem(key: string, value: string): void {
    this.kho.set(key, String(value));
  }
}

const caiDat = (dich: typeof globalThis | Window) => {
  const co = (dich as { localStorage?: Storage }).localStorage;
  if (co && typeof co.getItem === 'function') return;
  Object.defineProperty(dich, 'localStorage', {
    value: new BoNhoTam(),
    configurable: true,
    writable: true,
  });
};

caiDat(globalThis);
if (typeof window !== 'undefined') caiDat(window);
