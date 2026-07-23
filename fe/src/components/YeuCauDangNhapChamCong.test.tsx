// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { YeuCauDangNhapChamCong } from './YeuCauDangNhapChamCong';

const mockAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth() }));

function ve() {
  return render(
    <MemoryRouter initialEntries={['/toi/cham-cong']}>
      <Routes>
        <Route
          path="/toi/cham-cong"
          element={
            <YeuCauDangNhapChamCong>
              <div>NOI DUNG</div>
            </YeuCauDangNhapChamCong>
          }
        />
        <Route path="/toi/login" element={<div>CONG CHAM CONG</div>} />
        <Route path="/login" element={<div>LOGIN CU</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('YeuCauDangNhapChamCong', () => {
  beforeEach(() => mockAuth.mockReset());

  it('đã đăng nhập → render nội dung', () => {
    mockAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    ve();
    expect(screen.getByText('NOI DUNG')).toBeTruthy();
  });

  /**
   * Nhánh quan trọng nhất: phải về /toi/login, KHÔNG về /login. /login sẽ bật
   * sang Portal và cổng chấm công không bao giờ được nhìn thấy.
   */
  it('chưa đăng nhập → về /toi/login, không phải /login', () => {
    mockAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });
    ve();
    expect(screen.getByText('CONG CHAM CONG')).toBeTruthy();
    expect(screen.queryByText('LOGIN CU')).toBeNull();
  });

  /**
   * Đang khôi phục phiên mà đã chuyển hướng thì người đang đăng nhập hợp lệ
   * vẫn bị ném về màn nhập mật khẩu mỗi lần tải trang.
   */
  it('đang tải → chưa chuyển hướng, chưa render nội dung', () => {
    mockAuth.mockReturnValue({ isAuthenticated: false, isLoading: true });
    ve();
    expect(screen.queryByText('CONG CHAM CONG')).toBeNull();
    expect(screen.queryByText('NOI DUNG')).toBeNull();
  });
});
