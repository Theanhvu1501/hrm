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

function ve() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TrangChuTheoQuyen />} />
        <Route path="/cau-hinh/vai-tro" element={<div>KHU QUAN TRI</div>} />
        <Route path="/toi/cham-cong" element={<div>MAN CHAM CONG</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TrangChuTheoQuyen', () => {
  beforeEach(() => mockAuth.mockReset());

  it('có quyền quản trị → vào khu quản trị', () => {
    mockAuth.mockReturnValue({
      user: { isSuperAdmin: false },
      hasPermission: (q: string) => q === '/cau-hinh/vai-tro:xem',
    });
    ve();
    expect(screen.getByText('KHU QUAN TRI')).toBeTruthy();
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

  it('superadmin → vào khu quản trị kể cả khi danh sách quyền rỗng', () => {
    mockAuth.mockReturnValue({
      user: { isSuperAdmin: true },
      hasPermission: () => false,
    });
    ve();
    expect(screen.getByText('KHU QUAN TRI')).toBeTruthy();
  });
});
