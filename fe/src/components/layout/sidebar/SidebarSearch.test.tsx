// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { timMuc } from './SidebarSearch';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

const modules: VisibleModule[] = [
  {
    module: { id: 'nhan-su', label: 'Kho', railLabel: 'Kho', icon: null },
    leaves: [{ key: '/kho/nhap-kho', label: 'Nhập kho', module: 'nhan-su', status: 'ok' }],
  },
  {
    module: { id: 'cham-cong', label: 'Thuế', railLabel: 'Thuế', icon: null },
    leaves: [{ key: '/thue/tong-hop', label: 'Bảng tổng hợp thuế', module: 'cham-cong', status: 'ok' }],
  },
];

describe('timMuc', () => {
  it('tìm không dấu vẫn ra', () => {
    expect(timMuc(modules, 'nhap kho').map((r) => r.leaf.key)).toEqual(['/kho/nhap-kho']);
  });

  it('không phân biệt hoa thường', () => {
    expect(timMuc(modules, 'THUE')).toHaveLength(1);
  });

  it('kèm tên phân hệ để biết mục nằm ở đâu', () => {
    expect(timMuc(modules, 'tổng hợp')[0].moduleLabel).toBe('Thuế');
  });

  it('từ khóa rỗng thì không trả gì', () => {
    expect(timMuc(modules, '  ')).toEqual([]);
  });
});
