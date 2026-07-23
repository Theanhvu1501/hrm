// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaiKhoanPage from './TaiKhoanPage';
import { attendanceRecordService } from '@/services/attendanceRecordService';
import { employeeDeviceService } from '@/services/employeeDeviceService';

const mockAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth() }));

function homNayMau() {
  return {
    ngay: '2026-07-23',
    ngayCong: '2026-07-23',
    nhanVien: { id: 'e1', hoTen: 'Nguyễn Văn Hải', employeeCode: 'NV0001' },
    phongBan: 'Phòng Kỹ thuật',
    ca: null,
    diaDiem: [],
    soCong: 0,
    hanhDongKeTiep: 'vao' as const,
    banGhi: [],
  };
}

describe('TaiKhoanPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuth.mockReturnValue({
      user: { hoTen: 'Nguyễn Văn Hải', isSuperAdmin: false },
      logout: vi.fn(),
      hasPermission: () => false,
    });
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau() as any);
    vi.spyOn(employeeDeviceService, 'cuaToi').mockResolvedValue([]);
  });

  const ve = () => render(<MemoryRouter><TaiKhoanPage /></MemoryRouter>);

  it('hiện họ tên, phòng ban và mã nhân viên', async () => {
    ve();
    await waitFor(() => expect(screen.getByText(/Phòng Kỹ thuật/)).toBeTruthy());
    expect(screen.getByText('Nguyễn Văn Hải')).toBeTruthy();
    expect(screen.getByText(/NV0001/)).toBeTruthy();
  });

  it('liệt kê thiết bị của tôi kèm trạng thái', async () => {
    vi.spyOn(employeeDeviceService, 'cuaToi').mockResolvedValue([
      { id: 'd1', employeeId: 'e1', deviceId: 'abc', tenThietBi: 'iPhone của Hải',
        trangThai: 'cho_duyet', isActive: true },
    ] as any);

    ve();

    await waitFor(() => expect(screen.getByText('iPhone của Hải')).toBeTruthy());
    expect(screen.getByText('Chờ duyệt')).toBeTruthy();
  });

  /**
   * HR mở app trên điện thoại phải có lối về khu quản trị. Không có mục này
   * thì họ mắc kẹt trong /toi và chỉ thoát được bằng cách gõ tay URL.
   */
  it('hiện "Khu quản trị" cho người có quyền quản trị', async () => {
    mockAuth.mockReturnValue({
      user: { hoTen: 'Trần Thị HR', isSuperAdmin: false },
      logout: vi.fn(),
      hasPermission: (q: string) => q === '/cau-hinh/vai-tro:xem',
    });

    ve();

    await waitFor(() => expect(screen.getByText('Khu quản trị')).toBeTruthy());
  });

  it('ẩn "Khu quản trị" với nhân viên thường', async () => {
    ve();
    await waitFor(() => expect(screen.getByText('Đăng xuất')).toBeTruthy());
    expect(screen.queryByText('Khu quản trị')).toBeNull();
  });

  /**
   * Tài khoản chưa được gán hồ sơ nhân viên: /hom-nay trả 404. Màn hình
   * phải còn dùng được (còn nút đăng xuất) và nói rõ việc cần làm, chứ
   * không được trắng.
   */
  it('chưa liên kết hồ sơ: vẫn hiện tên từ phiên đăng nhập và nhắc liên hệ HR', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockRejectedValue(new Error('404'));

    ve();

    await waitFor(() => expect(screen.getByText(/chưa được gắn với hồ sơ nhân viên/i)).toBeTruthy());
    expect(screen.getByText('Nguyễn Văn Hải')).toBeTruthy();
    expect(screen.getByText('Đăng xuất')).toBeTruthy();
  });
});
