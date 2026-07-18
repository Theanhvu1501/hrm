import { describe, it, expect } from 'vitest';
import {
  REGISTRY,
  defaultVisibleKeys,
  loadVisibleKeys,
  saveVisibleKeys,
} from './columnRegistry';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, val: string) => void map.set(k, val),
  };
}

describe('columnRegistry', () => {
  it('default visible = đúng 9 cột gốc', () => {
    expect(defaultVisibleKeys()).toEqual([
      'ngay', 'soPhieu', 'ngayChungTu', 'noiDung', 'tkDoiUng',
      'phatSinhNo', 'phatSinhCo', 'soDuNo', 'soDuCo',
    ]);
  });

  it('mọi key trong registry là duy nhất', () => {
    const keys = REGISTRY.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('lưu rồi đọc lại trả về đúng tập key', () => {
    const store = memoryStorage();
    saveVisibleKeys(['ngay', 'noiDung', 'maDoiTuong'], store);
    expect(loadVisibleKeys(store)).toEqual(['ngay', 'noiDung', 'maDoiTuong']);
  });

  it('không có dữ liệu lưu → trả về default', () => {
    const store = memoryStorage();
    expect(loadVisibleKeys(store)).toEqual(defaultVisibleKeys());
  });

  it('dữ liệu lưu hỏng → trả về default', () => {
    const store = memoryStorage();
    store.setItem('sct-visible-columns:_', '{not json');
    expect(loadVisibleKeys(store)).toEqual(defaultVisibleKeys());
  });

  it('tách riêng theo công ty: mỗi tenant một bộ cột', () => {
    const store = memoryStorage();
    store.setItem('current_tenant', JSON.stringify({ tenantId: 'cty-A' }));
    saveVisibleKeys(['ngay', 'noiDung'], store);
    expect(store.getItem('sct-visible-columns:cty-A')).toBe(
      JSON.stringify(['ngay', 'noiDung']),
    );

    // Công ty B chưa lưu → default; lưu riêng không đụng A.
    store.setItem('current_tenant', JSON.stringify({ tenantId: 'cty-B' }));
    expect(loadVisibleKeys(store)).toEqual(defaultVisibleKeys());
    saveVisibleKeys(['ngay'], store);

    // Quay lại A → giữ nguyên bộ cột của A.
    store.setItem('current_tenant', JSON.stringify({ tenantId: 'cty-A' }));
    expect(loadVisibleKeys(store)).toEqual(['ngay', 'noiDung']);
  });
});
