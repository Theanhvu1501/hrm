// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TrangChuTheoQuyen from './TrangChuTheoQuyen';

const mockAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth(),
}));
// Trang tổng quan gọi API — ở đây chỉ kiểm việc CHỌN ĐÍCH nên thay bằng bản giả.
vi.mock('./loadable', () => ({
  TrangChuPage: () => <div>TRANG CHU TONG QUAN</div>,
}));

function ve() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TrangChuTheoQuyen />} />
        <Route path="/toi/cham-cong" element={<div>MAN CHAM CONG</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TrangChuTheoQuyen', () => {
  beforeEach(() => mockAuth.mockReset());

  it('có quyền quản trị → thấy trang chủ tổng quan', () => {
    mockAuth.mockReturnValue({
      user: { isSuperAdmin: false },
      hasPermission: (q: string) => q === '/cau-hinh/vai-tro:xem',
    });
    ve();
    expect(screen.getByText('TRANG CHU TONG QUAN')).toBeTruthy();
  });

  /**
   * Nhánh quan trọng nhất: người mới đi làm chưa được HR gán vai trò. Trước
   * thay đổi này họ rơi thẳng vào /cau-hinh/vai-tro và gặp màn 403 — đúng
   * cái màn không nên là ấn tượng đầu tiên.
   */
  it('không có quyền nào → vào màn chấm công', () => {
    mockAuth.mockReturnValue({
      user: { isSuperAdmin: false },
      hasPermission: () => false,
    });
    ve();
    expect(screen.getByText('MAN CHAM CONG')).toBeTruthy();
  });

  it('superadmin → thấy trang chủ tổng quan kể cả khi danh sách quyền rỗng', () => {
    mockAuth.mockReturnValue({
      user: { isSuperAdmin: true },
      hasPermission: () => false,
    });
    ve();
    expect(screen.getByText('TRANG CHU TONG QUAN')).toBeTruthy();
  });
});
