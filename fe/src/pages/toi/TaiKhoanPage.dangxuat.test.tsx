// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Finding 3 — kiểm ở tầng LẮP GHÉP.
 *
 * Hai test đăng xuất cũ của Task 6 đều `vi.mock('@/contexts/AuthContext')`,
 * nên chúng chỉ thấy "có gọi logout không" và không bao giờ nhìn được thứ thật
 * sự sai: `AuthContext.logout` vốn đã POST `/api/logout` (nên màn hình gọi
 * `identityLogout()` nữa là bắn hai lượt) và nó đưa người dùng về Portal —
 * đúng chặng đường vòng đợt này sinh ra để xoá.
 *
 * File này KHÔNG mock AuthContext: dùng `AuthProvider` thật để đếm được số
 * lượt `/api/logout` và đọc được đích hạ cánh.
 */

vi.mock('@/services/identitySession', () => ({
  refreshFromIdentity: vi.fn(async () => null),
  decodeTenantId: () => null,
  isIdentityConfigured: () => false,
  identityLogout: vi.fn(async () => undefined),
}));
vi.mock('@/services/identityRedirect', () => ({
  redirectToIdentityLogin: () => false,
}));
vi.mock('@/services/authService', () => ({
  authService: { getMe: vi.fn(async () => { throw new Error('chưa có phiên'); }), login: vi.fn(), logout: vi.fn(async () => undefined) },
}));
vi.mock('@/services/linhVucService', () => ({
  linhVucService: { getAll: vi.fn(async () => []) },
}));

import TaiKhoanPage from './TaiKhoanPage';
import { AuthProvider } from '@/contexts/AuthContext';
import { attendanceRecordService } from '@/services/attendanceRecordService';
import { employeeDeviceService } from '@/services/employeeDeviceService';
import { setAuthToken, getAuthToken, clearAuthToken } from '@/services/base/service-base';
import * as identity from '@/services/identitySession';
import { HoSoChamCongProvider } from '@/contexts/HoSoChamCongContext';

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {},
      dispatchEvent: () => false,
    }));
});

const PORTAL = 'https://portal.test';

let loc: { href: string; pathname: string; search: string };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  clearAuthToken();
  vi.stubEnv('VITE_IDENTITY_URL', PORTAL);
  loc = { href: '', pathname: '/toi/tai-khoan', search: '' };
  vi.stubGlobal('location', loc);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(attendanceRecordService, 'homNay').mockRejectedValue(new Error('bỏ qua'));
  vi.spyOn(employeeDeviceService, 'cuaToi').mockResolvedValue([]);
  (identity.identityLogout as ReturnType<typeof vi.fn>).mockClear();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function ve() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {/* TaiKhoanPage đọc /hom-nay qua HoSoChamCongProvider (Task 7). */}
        <HoSoChamCongProvider>
          <TaiKhoanPage />
        </HoSoChamCongProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

async function bamDangXuat() {
  await waitFor(() => expect(screen.getByText('Đăng xuất')).toBeTruthy());
  fireEvent.click(screen.getByText('Đăng xuất'));
}

function soLuotLogoutIdentity() {
  return fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/logout')).length;
}

describe('TaiKhoanPage — đăng xuất (lắp ghép với AuthProvider thật)', () => {
  it('hạ cánh ở /toi/login, KHÔNG đi vòng qua Portal', async () => {
    ve();
    await bamDangXuat();

    await waitFor(() => expect(loc.href).toBe('/toi/login'));
    expect(loc.href).not.toBe(PORTAL);
  });

  it('chỉ đóng phiên identity ĐÚNG MỘT lượt cho một cú bấm', async () => {
    ve();
    await bamDangXuat();

    await waitFor(() => expect(loc.href).toBe('/toi/login'));
    expect(soLuotLogoutIdentity()).toBe(1);
    // Màn hình không được gọi lại `identityLogout()` — `AuthContext.logout` đã
    // làm việc đó rồi.
    expect(identity.identityLogout).not.toHaveBeenCalled();
  });

  /**
   * Giữ ý định của test cũ "identity lỗi thì vẫn dọn phiên cục bộ", nhưng kiểm
   * ở tầng thật: người dùng đã bấm rồi thì token cục bộ phải bay và trang vẫn
   * phải đi tiếp, bất kể identity trả lời ra sao.
   */
  it('identity lỗi vẫn xoá token cục bộ và vẫn về /toi/login', async () => {
    setAuthToken('token-cua-nguoi-truoc');
    fetchMock.mockRejectedValue(new Error('offline'));

    ve();
    await bamDangXuat();

    await waitFor(() => expect(loc.href).toBe('/toi/login'));
    expect(getAuthToken()).toBeNull();
  });
});
