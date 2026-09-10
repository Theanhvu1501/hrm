// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MENU_MODULES } from '@/config/menuCatalog';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));

describe('Sidebar', () => {
  // Mọi test dùng chung userId mock ('u1') → chung khoá localStorage
  // `sidebar-thu-gon:u1`. Test "thu gọn panel" ghi `true` vào đó; không dọn
  // thì giá trị rò sang các test sau.
  beforeEach(() => {
    localStorage.clear();
  });

  it('rail hiện đủ các phân hệ với SuperAdmin', () => {
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    // Scope vào đúng thanh rail — panel tự render thêm nút mục con.
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(within(rail).getAllByRole('button')).toHaveLength(MENU_MODULES.length);
  });

  it('panel mở đúng phân hệ của trang đang xem', () => {
    render(<MemoryRouter initialEntries={['/cham-cong/bang-cong']}><Sidebar /></MemoryRouter>);
    expect(screen.getByText('Bảng công')).toBeTruthy();
    expect(screen.getByText('Đơn chấm công')).toBeTruthy();
    expect(screen.queryByText('Hồ sơ nhân viên')).toBeNull();
  });

  it('bấm lại phân hệ đang mở thì thu gọn panel', () => {
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Nhân sự —/));
    expect(screen.queryByText('Hợp đồng lao động')).toBeNull();
  });

  it('bấm rail phân hệ khác thì panel đổi sang phân hệ đó', () => {
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Chấm công —/));
    expect(screen.getByText('Bảng công')).toBeTruthy();
    expect(screen.queryByText('Hợp đồng lao động')).toBeNull();
  });

  it('phân hệ có route (Tổng quan, Báo cáo) không mở panel', () => {
    render(<MemoryRouter initialEntries={['/']}><Sidebar /></MemoryRouter>);
    // Ô tìm nhanh chỉ nằm trong panel → vắng mặt nghĩa là panel không render.
    expect(screen.queryByPlaceholderText('Tìm nhanh')).toBeNull();
  });

  it('bấm rail phân hệ có route thì điều hướng, không bung panel', () => {
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Báo cáo —/));
    expect(screen.queryByText('Hợp đồng lao động')).toBeNull();
    expect(screen.queryByPlaceholderText('Tìm nhanh')).toBeNull();
  });

  it('panel bám theo URL khi điều hướng không qua rail (Tìm nhanh) — không kẹt ở lựa chọn cũ', () => {
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    expect(screen.getByText('Hợp đồng lao động')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Tìm nhanh'), { target: { value: 'Bảng công' } });
    fireEvent.click(screen.getByText('Bảng công'));

    expect(screen.getByText('Bảng công')).toBeTruthy();
    expect(screen.queryByText('Hợp đồng lao động')).toBeNull();
  });

  /**
   * Cờ `focusTick` chỉ tăng, không bao giờ về 0. Sau một lần ⌘K, mở lại panel
   * bằng chuột làm SidebarSearch mount lại và effect [tick] chạy với giá trị
   * còn khác 0 → ô tìm cướp con trỏ dù người dùng chỉ bấm icon rail.
   */
  it('bấm rail mở lại panel KHÔNG cướp con trỏ, dù trước đó đã bấm ⌘K', () => {
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Tìm nhanh'));

    fireEvent.click(screen.getByTitle(/^Nhân sự —/)); // thu gọn
    fireEvent.click(screen.getByTitle(/^Nhân sự —/)); // mở lại bằng chuột

    expect(document.activeElement).not.toBe(screen.getByPlaceholderText('Tìm nhanh'));
  });

  it('⌘K mở panel khi sidebar đang thu gọn', () => {
    localStorage.setItem('sidebar-thu-gon:u1', 'true');
    render(<MemoryRouter initialEntries={['/nhan-su/ho-so-nhan-vien']}><Sidebar /></MemoryRouter>);
    expect(screen.queryByText('Hợp đồng lao động')).toBeNull();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(screen.getByText('Hợp đồng lao động')).toBeTruthy();
  });
});
