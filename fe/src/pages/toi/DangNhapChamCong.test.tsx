// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DangNhapChamCong from './DangNhapChamCong';
import * as identity from '@/services/identitySession';
import * as dieuHuong from '@/ultils/dieuHuong';
import { KHOA_CONG_TY_DA_NHO } from './chonCongTy';

// antd Form/Grid gọi matchMedia trong hiệu ứng nội bộ; jsdom không có sẵn.
// Không polyfill thì Form ném lỗi ngay khi mount và ô mật khẩu không bao giờ
// xuất hiện — cùng cách các test antd Form khác trong repo này đã xử lý
// (xem ChamCongCuaToiPage.render.test.tsx).
beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
});

const A = { tenantId: 't1', tenantName: 'Công ty A' };
const B = { tenantId: 't2', tenantName: 'Công ty B' };

const ve = () => render(<MemoryRouter><DangNhapChamCong /></MemoryRouter>);

let diToi: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  // sessionStorage.clear() ở đây là bắt buộc: cờ chống-vòng-lặp ở Finding 1
  // sống trong sessionStorage cả đời tab, nên nếu không dọn, một test trước
  // đã điều hướng thành công sẽ để lại cờ và làm sai lệch mọi test sau.
  sessionStorage.clear();
  // KHÔNG spy window.location.assign — jsdom ném "Cannot redefine property".
  diToi = vi.spyOn(dieuHuong, 'diToi').mockImplementation(() => {});
});

describe('DangNhapChamCong — phiên còn sống', () => {
  /**
   * NHÁNH DỄ MẤT NHẤT. Đường hạnh phúc của người mới vẫn xanh khi nó hỏng, và
   * hậu quả là người dùng bị hỏi mật khẩu mỗi lần mở app — đúng cái mà cả đợt
   * này sinh ra để tránh. Cookie mc_session là refresh token dài hạn, còn
   * access token chỉ sống 15 phút.
   */
  it('không bao giờ render ô mật khẩu khi phiên identity còn sống', async () => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([A]);
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');
    const login = vi.spyOn(identity, 'identityLogin');

    ve();

    // Assertion ĐỒNG BỘ, ngay sau render, TRƯỚC bất kỳ await nào: nếu ô mật
    // khẩu từng chớp qua màn hình lúc đang dò phiên rồi mới điều hướng, chỉ
    // kiểm tra sau waitFor(diToi) bên dưới sẽ không bao giờ bắt được — lúc đó
    // component đã ở màn spinner rồi, chớp nháy đã qua.
    expect(screen.queryByLabelText(/mật khẩu/i)).toBeNull();

    await waitFor(() => expect(diToi).toHaveBeenCalledWith('/toi/cham-cong'));
    expect(screen.queryByLabelText(/mật khẩu/i)).toBeNull();
    expect(login).not.toHaveBeenCalled();
  });

  it('phiên còn sống nhưng không công ty nào → báo lỗi, không hiện ô mật khẩu', async () => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([]);

    ve();

    await waitFor(() =>
      expect(screen.getByText(/chưa được cấp quyền dùng ứng dụng Nhân sự/i)).toBeTruthy()
    );
    expect(screen.queryByLabelText(/mật khẩu/i)).toBeNull();
    // Finding 2a: không có danh sách để chọn thì không phải là "Chọn công ty".
    expect(screen.queryByText('Chọn công ty')).toBeNull();
  });

  /**
   * Finding 2b: danh sách rỗng từng là ngõ cụt tuyệt đối — phiên identity vẫn
   * sống nên reload cũng chỉ quay lại đúng màn báo lỗi này. Ai lỡ đăng nhập
   * nhầm tài khoản trên thiết bị mượn sẽ kẹt tới khi tự tay xoá cookie.
   */
  it('không có công ty nào → có nút "Đăng nhập tài khoản khác", bấm thì đăng xuất và quay lại ô mật khẩu', async () => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([]);
    const logout = vi.spyOn(identity, 'identityLogout').mockResolvedValue(undefined);

    ve();

    await waitFor(() =>
      expect(screen.getByText(/chưa được cấp quyền dùng ứng dụng Nhân sự/i)).toBeTruthy()
    );
    const nutDangXuat = screen.getByRole('button', { name: /đăng nhập tài khoản khác/i });
    expect(screen.queryByLabelText(/mật khẩu/i)).toBeNull();

    fireEvent.click(nutDangXuat);

    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText(/mật khẩu/i)).toBeTruthy());
  });
});

describe('DangNhapChamCong — chặn vòng lặp reload khi tự động điều hướng', () => {
  /**
   * Finding 1. Kịch bản thật: `diToi` là full page reload; nếu sau reload
   * backend hrm lỗi, guard đá người dùng ngược lại đúng màn này — phiên
   * identity vẫn sống nên nó tự động thử điều hướng lại, thành vòng lặp
   * reload vô hạn. Mô phỏng "quay lại tab cũ sau khi bị đá" bằng cách unmount
   * rồi render lại: sessionStorage (không bị beforeEach dọn giữa 2 lần render
   * trong CÙNG một test) phải còn nhớ là đã thử 1 lần.
   */
  it('đã điều hướng 1 lần trong tab rồi thì lần render sau không điều hướng lại nữa', async () => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([A]);
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');

    const lanDau = ve();
    await waitFor(() => expect(diToi).toHaveBeenCalledTimes(1));
    lanDau.unmount();

    diToi.mockClear();
    ve();

    await waitFor(() =>
      expect(screen.getByText(/Không vào được màn chấm công/i)).toBeTruthy()
    );
    expect(diToi).not.toHaveBeenCalled();
  });
});

describe('DangNhapChamCong — chưa có phiên', () => {
  beforeEach(() => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue(null);
  });

  const nhapVaGui = async () => {
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'hai@cty.vn' } });
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), { target: { value: 'matkhau' } });
    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
  };

  it('hiện ô email + mật khẩu', async () => {
    ve();
    await waitFor(() => expect(screen.getByLabelText(/mật khẩu/i)).toBeTruthy());
  });

  it('đăng nhập đúng, một công ty → vào thẳng chấm công', async () => {
    vi.spyOn(identity, 'identityLogin').mockResolvedValue('ok');
    vi.spyOn(identity, 'identityTenants')
      .mockResolvedValueOnce(null)   // lần thử đầu: chưa có phiên
      .mockResolvedValue([A]);       // sau khi login
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');

    ve();
    await nhapVaGui();

    await waitFor(() => expect(diToi).toHaveBeenCalledWith('/toi/cham-cong'));
  });

  it('sai mật khẩu → báo đúng câu, không điều hướng', async () => {
    vi.spyOn(identity, 'identityLogin').mockResolvedValue('sai_thong_tin');

    ve();
    await nhapVaGui();

    await waitFor(() => expect(screen.getByText(/Email hoặc mật khẩu không đúng/i)).toBeTruthy());
    expect(diToi).not.toHaveBeenCalled();
  });

  it('lỗi mạng → báo lỗi mạng, KHÔNG báo sai mật khẩu', async () => {
    vi.spyOn(identity, 'identityLogin').mockResolvedValue('loi_mang');

    ve();
    await nhapVaGui();

    await waitFor(() => expect(screen.getByText(/Không kết nối được máy chủ/i)).toBeTruthy());
    expect(screen.queryByText(/mật khẩu không đúng/i)).toBeNull();
  });

  it('refresh không trả token → báo lỗi mở phiên, không điều hướng', async () => {
    vi.spyOn(identity, 'identityLogin').mockResolvedValue('ok');
    vi.spyOn(identity, 'identityTenants').mockResolvedValueOnce(null).mockResolvedValue([A]);
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue(null);

    ve();
    await nhapVaGui();

    await waitFor(() => expect(screen.getByText(/Không mở được phiên làm việc/i)).toBeTruthy());
    expect(diToi).not.toHaveBeenCalled();
  });
});

describe('DangNhapChamCong — nhiều công ty', () => {
  it('chưa nhớ gì → hiện danh sách; chọn xong thì nhớ lại và vào', async () => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([A, B]);
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');

    ve();

    await waitFor(() => expect(screen.getByText('Công ty B')).toBeTruthy());
    expect(diToi).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Công ty B'));

    await waitFor(() => expect(diToi).toHaveBeenCalledWith('/toi/cham-cong'));
    expect(localStorage.getItem(KHOA_CONG_TY_DA_NHO)).toBe('t2');
  });

  it('đã nhớ và còn hợp lệ → vào thẳng, không hiện danh sách', async () => {
    localStorage.setItem(KHOA_CONG_TY_DA_NHO, 't2');
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([A, B]);
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');

    ve();

    await waitFor(() => expect(diToi).toHaveBeenCalledWith('/toi/cham-cong'));
    expect(screen.queryByText('Công ty B')).toBeNull();
  });
});
