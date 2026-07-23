// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EmployeeLayout from './EmployeeLayout';
import {
  attendanceRecordService,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { hoTen: 'Nguyễn Văn Hải' },
    currentTenant: { tenantName: 'Công ty ABC' },
  }),
}));

// Cùng hình dạng homNayMau() dùng ở ChamCongCuaToiPage.render.test.tsx và
// TaiKhoanPage.test.tsx — không tự bịa hình dạng thứ ba.
function homNayMau(over: Partial<TrangThaiHomNay> = {}): TrangThaiHomNay {
  return {
    ngay: '2026-07-23',
    ngayCong: '2026-07-23',
    nhanVien: { id: 'e1', hoTen: 'Nguyễn Văn Hải', employeeCode: 'NV0001' },
    phongBan: 'Phòng Kỹ thuật',
    ca: null,
    diaDiem: [],
    soCong: 0,
    hanhDongKeTiep: 'vao',
    banGhi: [],
    ...over,
  } as TrangThaiHomNay;
}

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
  beforeEach(() => {
    vi.restoreAllMocks();
    // Vỏ nhân viên giờ nạp /hom-nay một lần (HoSoChamCongProvider) để header
    // lấy phòng ban — mock mặc định để các test không quan tâm phòng ban
    // khỏi phải tự khai báo, và khỏi bắn request thật trong môi trường test.
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
  });

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

  it('header hiện phòng ban', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({ phongBan: 'Phòng Kỹ thuật' })
    );
    ve('/toi/cham-cong');
    await waitFor(() => expect(screen.getByText('Phòng Kỹ thuật')).toBeTruthy());
  });

  it('thiếu phòng ban thì không hiện dòng rỗng', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({ phongBan: undefined })
    );
    ve('/toi/cham-cong');
    // 'Nguyễn Văn Hải' hiện sẵn ngay từ AuthContext (không cần chờ
    // /hom-nay), nên waitFor riêng nó KHÔNG chứng minh được state `hoSo` đã
    // cập nhật xong. Xả hết hàng đợi microtask (chuỗi then/catch/finally
    // của effect) bằng một tick setTimeout thật trước khi khẳng định vắng
    // mặt — nếu không, test này xanh ngay cả với một provider chưa từng
    // chạy effect.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Nguyễn Văn Hải')).toBeTruthy();
    expect(screen.queryByTestId('header-phong-ban')).toBeNull();
  });
});
