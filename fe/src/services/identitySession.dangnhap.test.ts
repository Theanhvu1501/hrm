import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const IDENTITY = 'http://localhost:3020'; // khớp VITE_IDENTITY_URL của .env.development

function gia(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

// identitySession.ts đọc VITE_IDENTITY_URL vào một const NGAY KHI module được
// import (không đọc lại mỗi lần gọi hàm — xem `refreshFromIdentity` cùng file).
// Vì vậy phải vi.stubEnv() TRƯỚC rồi vi.resetModules() + import động, giống hệt
// cách identitySession.test.ts đã test refreshFromIdentity — import tĩnh ở đầu
// file sẽ đóng băng IDENTITY_URL = undefined trước khi bất kỳ "it" nào chạy.
async function moduleVoiIdentityUrl() {
  vi.stubEnv('VITE_IDENTITY_URL', IDENTITY);
  vi.resetModules();
  return import('./identitySession');
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('identityLogin', () => {
  it('gửi email/mật khẩu kèm cookie và trả "ok" khi thành công', async () => {
    const f = gia(200, { success: true, data: {} });
    vi.stubGlobal('fetch', f);
    const { identityLogin } = await moduleVoiIdentityUrl();

    expect(await identityLogin('hai@cty.vn', 'matkhau')).toBe('ok');

    expect(f).toHaveBeenCalledWith(
      `${IDENTITY}/api/login`,
      expect.objectContaining({
        method: 'POST',
        // Thiếu credentials thì identity không đặt được cookie mc_session và
        // mọi bước sau đều 401 — khoá lại bằng test.
        credentials: 'include',
        body: JSON.stringify({ email: 'hai@cty.vn', password: 'matkhau' }),
      })
    );
  });

  it('401 → "sai_thong_tin"', async () => {
    vi.stubGlobal('fetch', gia(401));
    const { identityLogin } = await moduleVoiIdentityUrl();
    expect(await identityLogin('a@b.c', 'sai')).toBe('sai_thong_tin');
  });

  it('mạng hỏng → "loi_mang", không ném', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { identityLogin } = await moduleVoiIdentityUrl();
    expect(await identityLogin('a@b.c', 'x')).toBe('loi_mang');
  });

  it('500 → "loi_mang" (không phải sai thông tin)', async () => {
    vi.stubGlobal('fetch', gia(500));
    const { identityLogin } = await moduleVoiIdentityUrl();
    expect(await identityLogin('a@b.c', 'x')).toBe('loi_mang');
  });
});

describe('identityTenants', () => {
  it('gọi đúng endpoint kèm app hiện tại', async () => {
    const f = gia(200, { success: true, data: [] });
    vi.stubGlobal('fetch', f);
    const { identityTenants } = await moduleVoiIdentityUrl();

    await identityTenants();

    expect(f).toHaveBeenCalledWith(
      `${IDENTITY}/api/me/tenants?app=nhan-su`,
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('trả danh sách rút gọn khi có phiên', async () => {
    vi.stubGlobal(
      'fetch',
      gia(200, {
        success: true,
        data: [
          { tenantId: 't1', tenantName: 'Công ty ABC', tenantSlug: 'abc', modules: [], nganh: null, apps: [] },
        ],
      })
    );
    const { identityTenants } = await moduleVoiIdentityUrl();

    expect(await identityTenants()).toEqual([{ tenantId: 't1', tenantName: 'Công ty ABC' }]);
  });

  /**
   * null KHÁC []. null = chưa đăng nhập → phải hiện ô mật khẩu.
   * [] = đã đăng nhập nhưng không được cấp app → phải báo lỗi, KHÔNG hỏi mật khẩu.
   * Gộp hai thứ là làm hỏng cả hai nhánh.
   */
  it('401 → null, không phải mảng rỗng', async () => {
    vi.stubGlobal('fetch', gia(401));
    const { identityTenants } = await moduleVoiIdentityUrl();
    expect(await identityTenants()).toBeNull();
  });

  it('có phiên nhưng không công ty nào → mảng rỗng, không phải null', async () => {
    vi.stubGlobal('fetch', gia(200, { success: true, data: [] }));
    const { identityTenants } = await moduleVoiIdentityUrl();
    expect(await identityTenants()).toEqual([]);
  });

  it('mạng hỏng → null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { identityTenants } = await moduleVoiIdentityUrl();
    expect(await identityTenants()).toBeNull();
  });
});

describe('identityLogout', () => {
  it('gọi POST /api/logout kèm cookie', async () => {
    const f = gia(200);
    vi.stubGlobal('fetch', f);
    const { identityLogout } = await moduleVoiIdentityUrl();

    await identityLogout();

    expect(f).toHaveBeenCalledWith(
      `${IDENTITY}/api/logout`,
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
  });

  // Đăng xuất KHÔNG được ném: người dùng đã bấm rồi, phần dọn phiên cục bộ
  // và điều hướng phải chạy tiếp dù identity có trả lời hay không.
  it('identity hỏng thì vẫn resolve, không ném', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { identityLogout } = await moduleVoiIdentityUrl();
    await expect(identityLogout()).resolves.toBeUndefined();
  });
});
