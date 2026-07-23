// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TaiKhoanPage from './TaiKhoanPage';
import { attendanceRecordService } from '@/services/attendanceRecordService';
import { employeeDeviceService } from '@/services/employeeDeviceService';
import { ApiError, ApiErrorType } from '@/config/api';

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
   *
   * Dùng đúng hình dạng `ApiError` status 404 (như `resolveEmployeeFromUser`
   * thật sự ném ra), không phải `Error` trần: sau khi màn hình phân biệt
   * 404 với lỗi khác (Finding 3), một `Error` trần không mang status sẽ rơi
   * vào nhánh "không tải được", không còn đúng kịch bản test này mô tả.
   */
  it('chưa liên kết hồ sơ: vẫn hiện tên từ phiên đăng nhập và nhắc liên hệ HR', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockRejectedValue(
      new ApiError('Not Found', ApiErrorType.NOT_FOUND, 404, {
        response: { status: 404, data: {} },
      }),
    );

    ve();

    await waitFor(() => expect(screen.getByText(/chưa được gắn với hồ sơ nhân viên/i)).toBeTruthy());
    expect(screen.getByText('Nguyễn Văn Hải')).toBeTruthy();
    expect(screen.getByText('Đăng xuất')).toBeTruthy();
  });

  /**
   * Finding 3: một cú rớt mạng/500/token hết hạn KHÔNG phải là "chưa gắn hồ
   * sơ" — trước đây `.catch` gộp mọi lỗi vào cùng một thông báo, đẩy người
   * dùng đi báo HR một chuyện HR không sửa được. Chỉ status 404 mới được
   * đọc là "chưa liên kết".
   */
  it('lỗi mạng khi tải /hom-nay: KHÔNG báo "chưa gắn hồ sơ", vẫn còn nút đăng xuất', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockRejectedValue(
      new ApiError('Network Error', ApiErrorType.NETWORK_ERROR, undefined, {}),
    );

    ve();

    await waitFor(() =>
      expect(screen.getByText(/không tải được thông tin nhân viên/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/chưa được gắn với hồ sơ nhân viên/i)).toBeNull();
    expect(screen.getByText('Đăng xuất')).toBeTruthy();
  });

  /**
   * Cùng lỗi hình dạng cho khối thiết bị: tải hỏng phải nói "không tải
   * được", không được lặng lẽ rơi về danh sách rỗng — nhân viên có máy đã
   * duyệt sẽ đọc thành máy mình bị gỡ.
   */
  it('lỗi tải thiết bị: KHÔNG báo "chưa có thiết bị nào được đăng ký"', async () => {
    vi.spyOn(employeeDeviceService, 'cuaToi').mockRejectedValue(
      new ApiError('Network Error', ApiErrorType.NETWORK_ERROR, undefined, {}),
    );

    ve();

    await waitFor(() =>
      expect(screen.getByText(/không tải được danh sách thiết bị/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/chưa có thiết bị nào được đăng ký/i)).toBeNull();
  });

  /**
   * Finding 3. Hai test đăng xuất trước đây mock `useAuth` nên không bao giờ
   * quan sát được đích hạ cánh — vì thế không ai thấy `AuthContext.logout` vốn
   * ĐÃ POST `/api/logout` (nên gọi thêm `identityLogout()` ở màn hình là bắn
   * hai lượt) và đưa nhân viên về Portal.
   *
   * Ở tầng này khoá đúng phần thuộc về màn hình: nó phải yêu cầu đích
   * `/toi/login` và không được tự đóng phiên identity lần nữa. Phần "yêu cầu
   * đó biến thành điều hướng thật" được khoá ở
   * `TaiKhoanPage.dangxuat.test.tsx` với AuthProvider thật.
   */
  it('đăng xuất yêu cầu hạ cánh ở /toi/login, không phải Portal', async () => {
    const logout = vi.fn();
    mockAuth.mockReturnValue({
      user: { hoTen: 'Nguyễn Văn Hải', isSuperAdmin: false },
      logout,
      hasPermission: () => false,
    });

    ve();
    await waitFor(() => expect(screen.getByText('Đăng xuất')).toBeTruthy());
    fireEvent.click(screen.getByText('Đăng xuất'));

    await waitFor(() => expect(logout).toHaveBeenCalledWith('/toi/login'));
  });

  it('không gọi identityLogout lần hai — AuthContext.logout đã đóng phiên identity', async () => {
    const identityLogout = vi
      .spyOn(await import('@/services/identitySession'), 'identityLogout')
      .mockResolvedValue(undefined);
    const logout = vi.fn();
    mockAuth.mockReturnValue({
      user: { hoTen: 'Nguyễn Văn Hải', isSuperAdmin: false },
      logout,
      hasPermission: () => false,
    });

    ve();
    await waitFor(() => expect(screen.getByText('Đăng xuất')).toBeTruthy());
    fireEvent.click(screen.getByText('Đăng xuất'));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(identityLogout).not.toHaveBeenCalled();
  });
});
