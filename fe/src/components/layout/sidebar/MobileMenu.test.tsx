// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileMenu } from './MobileMenu';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));

describe('MobileMenu', () => {
  it('lớp 1 liệt kê phân hệ, chưa hiện mục con', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Chấm công')).toBeTruthy();
    expect(screen.queryByText('Bảng công')).toBeNull();
  });

  it('chọn phân hệ thì trượt sang lớp 2, dùng đúng danh sách của panel', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Nhân sự'));
    expect(screen.getByText('Hồ sơ nhân viên')).toBeTruthy();
    expect(screen.getByText('HỒ SƠ & HỢP ĐỒNG')).toBeTruthy();
  });

  it('nút quay lại đưa về lớp 1', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Chấm công'));
    fireEvent.click(screen.getByLabelText('Quay lại danh sách phân hệ'));
    expect(screen.queryByText('Bảng công')).toBeNull();
  });
});
