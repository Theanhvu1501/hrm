// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

/**
 * Finding 1 — kiểm ở đúng tầng thấy được lỗi LẮP GHÉP.
 *
 * `AuthProvider` bọc TOÀN BỘ route, kể cả `/toi/login`. Trước bản sửa, khi
 * không có token hrm nó gọi `redirectToIdentityLogin()` vô điều kiện, tức là
 * ném thẳng nhân viên sang Portal `masterceo.com.vn` trong microtask — trước
 * cả khi cổng chấm công kịp dò phiên identity. Nhìn riêng `DangNhapChamCong`
 * hay riêng `AuthContext` đều không thấy được điều đó; phải mount thật
 * `AuthProvider` tại một đường dẫn `/toi` với storage rỗng.
 *
 * Test đối chứng ở cuối chứng minh ngoại lệ này HẸP: đường dẫn ngoài `/toi`
 * vẫn bật về Portal y như cũ.
 */

// --- Mocks: storage rỗng (máy mới / vừa xoá dữ liệu / PWA vừa cài) ---
vi.mock('@/services/base/service-base', () => ({
  setAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => null),
  clearAuthToken: vi.fn(),
  setCurrentTenant: vi.fn(),
  getCurrentTenant: vi.fn(() => null),
  clearCurrentTenant: vi.fn(),
}));

vi.mock('@/services/identitySession', () => ({
  refreshFromIdentity: vi.fn(async () => null),
  decodeTenantId: () => null,
  isIdentityConfigured: () => true,
}));

const redirectToIdentityLogin = vi.fn(() => true);
vi.mock('@/services/identityRedirect', () => ({
  redirectToIdentityLogin: () => redirectToIdentityLogin(),
}));

vi.mock('@/services/authService', () => ({
  authService: { getMe: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
vi.mock('@/services/linhVucService', () => ({
  linhVucService: { getAll: vi.fn(async () => []) },
}));

import { AuthProvider, useAuth } from './AuthContext';

function DoTrangThai() {
  const { isLoading, isAuthenticated } = useAuth();
  return <div>{isLoading ? 'DANG_TAI' : isAuthenticated ? 'DA_VAO' : 'CHUA_DANG_NHAP'}</div>;
}

function veTai(duongDan: string) {
  window.history.replaceState({}, '', duongDan);
  return render(
    <AuthProvider>
      <DoTrangThai />
    </AuthProvider>
  );
}

beforeEach(() => {
  redirectToIdentityLogin.mockClear();
});
afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('AuthProvider — ngoại lệ vỏ nhân viên (/toi)', () => {
  it('mở /toi/login với storage rỗng: KHÔNG đá về Portal', async () => {
    veTai('/toi/login');

    // Chờ initAuth chạy xong hẳn (isLoading tắt) rồi mới kết luận — kết luận
    // sớm thì test sẽ xanh cả khi redirect xảy ra ở microtask sau đó.
    await waitFor(() => expect(screen.getByText('CHUA_DANG_NHAP')).toBeTruthy());
    expect(redirectToIdentityLogin).not.toHaveBeenCalled();
  });

  /**
   * Nhánh riêng, không gộp với test trên: trước bản sửa `initAuth` `return`
   * TRƯỚC `setIsLoading(false)`, nên guard `YeuCauDangNhapChamCong` quay
   * spinner vĩnh viễn trong lúc trình duyệt bỏ đi. Kể cả khi ai đó sau này chỉ
   * chặn redirect mà quên đường rơi xuống, test này vẫn phải đỏ.
   */
  it('mở /toi/cham-cong với storage rỗng: initAuth chạy hết, isLoading tắt để guard quyết được', async () => {
    veTai('/toi/cham-cong');

    await waitFor(() => expect(screen.queryByText('DANG_TAI')).toBeNull());
    expect(screen.getByText('CHUA_DANG_NHAP')).toBeTruthy();
    expect(redirectToIdentityLogin).not.toHaveBeenCalled();
  });

  /**
   * ĐỐI CHỨNG — chứng minh ngoại lệ hẹp. Khu quản trị phải giữ nguyên hành vi
   * cũ: không có phiên thì vẫn bật thẳng về Portal.
   */
  it('mở /cau-hinh/vai-tro với storage rỗng: VẪN đá về Portal như cũ', async () => {
    veTai('/cau-hinh/vai-tro');

    await waitFor(() => expect(redirectToIdentityLogin).toHaveBeenCalled());
    // Redirect thì giữ nguyên màn loading (trang sắp đi khỏi), không nháy sang
    // màn "chưa đăng nhập".
    expect(screen.getByText('DANG_TAI')).toBeTruthy();
  });

  it('/toi bắt đầu bằng dấu / khác (vd /toidayroi) KHÔNG được hưởng ngoại lệ', async () => {
    veTai('/toidayroi');

    await waitFor(() => expect(redirectToIdentityLogin).toHaveBeenCalled());
  });

  it('401 giữa phiên ở /toi/cham-cong: dọn phiên nhưng KHÔNG đá về Portal', async () => {
    veTai('/toi/cham-cong');
    await waitFor(() => expect(screen.queryByText('DANG_TAI')).toBeNull());
    redirectToIdentityLogin.mockClear();

    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    await waitFor(() => expect(screen.getByText('CHUA_DANG_NHAP')).toBeTruthy());
    expect(redirectToIdentityLogin).not.toHaveBeenCalled();
  });

  it('ĐỐI CHỨNG: 401 giữa phiên ở /cau-hinh/vai-tro vẫn đá về Portal', async () => {
    veTai('/cau-hinh/vai-tro');
    await waitFor(() => expect(redirectToIdentityLogin).toHaveBeenCalled());
    redirectToIdentityLogin.mockClear();

    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    await waitFor(() => expect(redirectToIdentityLogin).toHaveBeenCalledTimes(1));
  });
});
