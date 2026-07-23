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

  /**
   * Finding 1 (đợt review sau). Cầu chì CHỈ được áp cho nhánh tự động lúc
   * mount — một cú bấm/gửi form CHỦ ĐỘNG của người dùng, theo định nghĩa,
   * không phải vòng lặp. Kịch bản thật đúng như finding mô tả: người dùng vừa
   * tự động vào thành công (cờ đã set), sau đó — vẫn trong CÙNG tab — quay
   * lại /toi/login (vd. bấm "Đăng nhập tài khoản khác") và tự tay đăng nhập
   * lại; `chonCongTy` tự chọn công ty duy nhất và gọi `vaoVoiCongTy` lần nữa
   * — màn phải vào được ngay, không được hiện "Thử lại" chỉ vì cờ cũ còn
   * sống từ lượt tự động thành công trước đó.
   */
  it('đã tự động vào thành công 1 lần rồi, sau đó người dùng chủ động đăng nhập lại vẫn vào được', async () => {
    vi.spyOn(identity, 'identityTenants').mockResolvedValue([A]);
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');

    // Bước 1: một lượt tự động vào THÀNH CÔNG trong tab này — set cờ.
    const lanDau = ve();
    await waitFor(() => expect(diToi).toHaveBeenCalledTimes(1));
    lanDau.unmount();
    diToi.mockClear();

    // Bước 2: mở lại /toi/login trong CÙNG tab (sessionStorage — và do đó cờ
    // — không bị dọn giữa 2 lần render này). Lần này phiên đã hết (vd. sau
    // "Đăng nhập tài khoản khác") nên effect lúc mount (tự động) chỉ dừng ở
    // ô mật khẩu — KHÔNG gọi vaoVoiCongTy, nên chưa hề tra cầu chì ở bước
    // này.
    vi.spyOn(identity, 'identityTenants')
      .mockResolvedValueOnce(null) // dò phiên lúc mount: đã đăng xuất trước đó
      .mockResolvedValue([A]);     // sau khi đăng nhập lại: vẫn đúng 1 công ty
    const login = vi.spyOn(identity, 'identityLogin').mockResolvedValue('ok');
    ve();
    await waitFor(() => expect(screen.getByLabelText(/mật khẩu/i)).toBeTruthy());
    expect(diToi).not.toHaveBeenCalled();

    // Bước 3: người dùng CHỦ ĐỘNG gửi form đăng nhập. `chonCongTy` tự chọn
    // lại đúng công ty duy nhất và gọi `vaoVoiCongTy` — đây là thao tác thủ
    // công, phải luôn điều hướng bất kể cờ cũ. Nếu cầu chì (bug cũ) áp luôn
    // cho cả đường này, màn sẽ dừng ở "Thử lại" dù không có gì lỗi thật.
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'hai@cty.vn' } });
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), { target: { value: 'matkhau' } });
    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(diToi).toHaveBeenCalledWith('/toi/cham-cong'));
    expect(screen.queryByText(/Không vào được màn chấm công/i)).toBeNull();
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

  /**
   * Finding 2. `guiDangNhap` chỉ tắt `dangGui` (và do đó bật lại nút) trong
   * `finally`, SAU khi `diTiepVoiPhien()` chạy xong — không phải ngay sau
   * `identityLogin`. Test này giữ `identityTenants` (bên trong
   * `diTiepVoiPhien`) treo lại có chủ đích để mô phỏng đúng cửa sổ hở: nếu
   * nút được bật lại sớm (bug cũ), bấm lần 2 ngay lúc đó sẽ gọi thêm một lượt
   * `identityLogin` nữa.
   */
  it('bấm gửi 2 lần liên tiếp trong lúc đang xử lý chỉ gọi identityLogin đúng 1 lần', async () => {
    let moTiepPhien!: (ds: identity.TenantChamCong[]) => void;
    vi.spyOn(identity, 'identityTenants')
      .mockResolvedValueOnce(null) // dò phiên lúc mount: chưa có → hiện form
      .mockImplementationOnce(
        () => new Promise((resolve) => { moTiepPhien = resolve; })
      );
    const login = vi.spyOn(identity, 'identityLogin').mockResolvedValue('ok');
    vi.spyOn(identity, 'refreshFromIdentity').mockResolvedValue('token-moi');

    ve();
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'hai@cty.vn' } });
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), { target: { value: 'matkhau' } });
    const nutGui = screen.getByRole('button', { name: /đăng nhập/i });

    fireEvent.click(nutGui);
    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));

    // Tại đây identityLogin đã resolve 'ok' nhưng diTiepVoiPhien vẫn đang chờ
    // identityTenants (bị giữ treo có chủ đích) — đúng cửa sổ hở của Finding
    // 2. Bấm lần 2 ngay bây giờ.
    fireEvent.click(nutGui);

    moTiepPhien([A]);
    await waitFor(() => expect(diToi).toHaveBeenCalledWith('/toi/cham-cong'));

    expect(login).toHaveBeenCalledTimes(1);
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
