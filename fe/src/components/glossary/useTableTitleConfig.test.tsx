// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTableTitleConfig } from './useTableTitleConfig';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { isSuperAdmin: false }, currentTenant: null, currentLinhVuc: null }),
}));

// Mỗi lần render trang dựng MẢNG CỘT MỚI — đúng như code thật.
const dungCot = () => [
  { title: 'Tên vai trò', dataIndex: 'ten', key: 'ten' },
  { title: 'Mô tả', dataIndex: 'moTa', key: 'moTa' },
  { key: 'action', render: () => null },
];

describe('useTableTitleConfig', () => {
  beforeEach(() => localStorage.clear());

  /**
   * Trang Vai trò / Quy chuẩn đẩy `settingsButton` lên cha bằng setState trong
   * useEffect. Nút mà đổi danh tính mỗi lần render thì cha set state → bảng
   * render lại → nút mới → lặp vô hạn ("Maximum update depth exceeded").
   */
  it('settingsButton giữ nguyên danh tính khi cột chỉ là mảng mới cùng nội dung', () => {
    const { result, rerender } = renderHook(({ cot }) => useTableTitleConfig('test.bang', cot), {
      initialProps: { cot: dungCot() },
    });
    const truoc = result.current.settingsButton;
    rerender({ cot: dungCot() });
    expect(result.current.settingsButton).toBe(truoc);
  });

  it('settingsButton đổi khi tiêu đề cột đổi thật', () => {
    const { result, rerender } = renderHook(({ cot }) => useTableTitleConfig('test.bang', cot), {
      initialProps: { cot: dungCot() },
    });
    const truoc = result.current.settingsButton;
    rerender({ cot: [...dungCot(), { title: 'Trạng thái', dataIndex: 'tt', key: 'tt' }] });
    expect(result.current.settingsButton).not.toBe(truoc);
  });
});
