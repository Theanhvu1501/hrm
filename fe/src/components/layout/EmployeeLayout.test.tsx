// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EmployeeLayout from './EmployeeLayout';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { hoTen: 'Nguyễn Văn Hải' },
    currentTenant: { tenantName: 'Công ty ABC' },
  }),
}));

function ve(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/toi" element={<EmployeeLayout />}>
          <Route path="cham-cong" element={<div>NOI DUNG CHAM CONG</div>} />
          <Route path="tai-khoan" element={<div>NOI DUNG TAI KHOAN</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('EmployeeLayout', () => {
  it('hiện tên người dùng và tên công ty trên header', () => {
    ve('/toi/cham-cong');
    expect(screen.getByText('Nguyễn Văn Hải')).toBeTruthy();
    expect(screen.getByText('Công ty ABC')).toBeTruthy();
  });

  it('render nội dung route con qua Outlet', () => {
    ve('/toi/cham-cong');
    expect(screen.getByText('NOI DUNG CHAM CONG')).toBeTruthy();
  });

  it('có đủ 4 tab ở đáy', () => {
    ve('/toi/cham-cong');
    ['Chấm công', 'Đơn từ', 'Bảng công', 'Tài khoản'].forEach((nhan) => {
      expect(screen.getByText(nhan)).toBeTruthy();
    });
  });

  /**
   * Tab đang mở phải nhận aria-current: đó là thứ duy nhất người dùng trình
   * đọc màn hình nắm được vị trí, và cũng là móc để test khỏi bám vào tên
   * lớp CSS.
   */
  it('đánh dấu đúng tab đang mở', () => {
    ve('/toi/tai-khoan');
    const tab = screen.getByText('Tài khoản').closest('a');
    expect(tab?.getAttribute('aria-current')).toBe('page');
    const tabKhac = screen.getByText('Chấm công').closest('a');
    expect(tabKhac?.getAttribute('aria-current')).toBeNull();
  });
});
