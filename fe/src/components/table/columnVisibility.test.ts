import { describe, it, expect } from 'vitest';
import { readSavedKeys, saveVisibleKeys, type StorageLike } from './columnVisibility';

function memoryStorage(): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, val: string) => void map.set(k, val),
    dump: () => Object.fromEntries(map),
  };
}

describe('columnVisibility', () => {
  it('trả null khi chưa có preference (caller hiểu là hiện tất cả)', () => {
    const s = memoryStorage();
    expect(readSavedKeys('p1', s)).toBeNull();
  });

  it('round-trip: lưu rồi đọc lại đúng mảng', () => {
    const s = memoryStorage();
    saveVisibleKeys('p1', ['a', 'b'], s);
    expect(readSavedKeys('p1', s)).toEqual(['a', 'b']);
  });

  it('tôn trọng mảng rỗng (người dùng ẩn hết) — không coi là chưa chọn', () => {
    const s = memoryStorage();
    saveVisibleKeys('p1', [], s);
    expect(readSavedKeys('p1', s)).toEqual([]);
  });

  it('mỗi pageKey tách biệt', () => {
    const s = memoryStorage();
    saveVisibleKeys('p1', ['a'], s);
    saveVisibleKeys('p2', ['b'], s);
    expect(readSavedKeys('p1', s)).toEqual(['a']);
    expect(readSavedKeys('p2', s)).toEqual(['b']);
  });

  it('JSON hỏng → null', () => {
    const s = memoryStorage();
    s.setItem('tblcols:_:p1', '{not json');
    expect(readSavedKeys('p1', s)).toBeNull();
  });

  it('không phải mảng string → null', () => {
    const s = memoryStorage();
    s.setItem('tblcols:_:p1', JSON.stringify([1, 2, 3]));
    expect(readSavedKeys('p1', s)).toBeNull();
    s.setItem('tblcols:_:p2', JSON.stringify({ a: 1 }));
    expect(readSavedKeys('p2', s)).toBeNull();
  });

  it('không có storage → null / no-op an toàn', () => {
    expect(readSavedKeys('p1', undefined)).toBeNull();
    expect(() => saveVisibleKeys('p1', ['a'], undefined)).not.toThrow();
  });

  it('dùng đúng prefix khoá lưu (chưa có công ty → scope `_`)', () => {
    const s = memoryStorage();
    saveVisibleKeys('soQuy.main', ['ngay'], s);
    expect(s.dump()['tblcols:_:soQuy.main']).toBe(JSON.stringify(['ngay']));
  });

  it('tách riêng theo công ty: mỗi tenant một bộ cột', () => {
    const s = memoryStorage();
    s.setItem('current_tenant', JSON.stringify({ tenantId: 'cty-A' }));
    saveVisibleKeys('p1', ['a'], s);
    expect(s.dump()['tblcols:cty-A:p1']).toBe(JSON.stringify(['a']));

    // Đổi sang công ty B → đọc chưa có preference, lưu sang khoá khác.
    s.setItem('current_tenant', JSON.stringify({ tenantId: 'cty-B' }));
    expect(readSavedKeys('p1', s)).toBeNull();
    saveVisibleKeys('p1', ['b'], s);

    // Quay lại công ty A → vẫn giữ bộ cột cũ của A.
    s.setItem('current_tenant', JSON.stringify({ tenantId: 'cty-A' }));
    expect(readSavedKeys('p1', s)).toEqual(['a']);
  });
});
