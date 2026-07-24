// @vitest-environment jsdom
/**
 * Khoá 5 nhánh của màn "Đơn từ" nhân viên — đường nộp đơn DUY NHẤT sau khi
 * Task 4 khoá các route quản trị bằng quyền `/cham-cong/don-tu:*`.
 *
 * Ba nhánh rỗng (đang tải / lỗi tải / thật sự chưa có đơn) trông giống nhau
 * đến mức nguy hiểm, nên chúng là phần lớn số test ở đây.
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DonTuCuaToiPage from './DonTuCuaToiPage';
import {
  attendanceRequestService,
  AttendanceRequest,
} from '@/services/attendanceRequestService';
import { ApiError, ApiErrorType } from '@/config/api';
import { homNayVN } from '@/ultils/thoiGianVN';

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

  // rc-trigger (nền của Popconfirm) đo lại vị trí popup bằng ResizeObserver,
  // thứ jsdom không có. Thiếu nó thì Popconfirm ném ngay lúc mở và test huỷ
  // đơn chết vì lý do chẳng liên quan gì tới việc huỷ đơn.
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

afterEach(() => {
  vi.restoreAllMocks();
});

function don(over: Partial<AttendanceRequest> = {}): AttendanceRequest {
  return {
    id: 'd1',
    employeeId: 'e1',
    loaiDon: 'giai_trinh',
    ngay: '2026-07-24',
    trangThai: 'cho_duyet',
    isActive: true,
    ...over,
  };
}

/** Lỗi đúng hình dạng GlobalExceptionFilter trả về qua gateway. */
function loiBackend(status: number, message: string) {
  return new ApiError(message, ApiErrorType.SERVER_ERROR, status, {
    response: { status, data: { success: false, error: { message } } },
  });
}

describe('Đơn từ của tôi — danh sách rỗng', () => {
  it('nói rõ "Chưa có đơn nào", không phải màn trắng', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([]);

    render(<DonTuCuaToiPage />);

    expect(await screen.findByText('Chưa có đơn nào')).toBeTruthy();
    // Và vẫn còn lối đi tiếp: nút nộp đơn.
    expect(screen.getByRole('button', { name: /Nộp đơn/ })).toBeTruthy();
  });
});

describe('Đơn từ của tôi — có đơn', () => {
  it('hiện đủ ba trạng thái, mỗi đơn một thẻ', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([
      don({ id: 'd1', loaiDon: 'nghi_phep', loaiNghi: 'phep_nam', trangThai: 'cho_duyet' }),
      don({ id: 'd2', loaiDon: 'lam_them_gio', trangThai: 'da_duyet' }),
      don({ id: 'd3', loaiDon: 'giai_trinh', trangThai: 'tu_choi' }),
    ]);

    render(<DonTuCuaToiPage />);

    await waitFor(() =>
      expect(screen.getAllByTestId('the-don')).toHaveLength(3),
    );
    expect(screen.getByText('Chờ duyệt')).toBeTruthy();
    expect(screen.getByText('Đã duyệt')).toBeTruthy();
    expect(screen.getByText('Từ chối')).toBeTruthy();
    expect(screen.getByText('Nghỉ phép')).toBeTruthy();
    expect(screen.getByText('Làm thêm giờ')).toBeTruthy();
    expect(screen.queryByText('Chưa có đơn nào')).toBeNull();
  });

  it('hiện các con số backend tự tính, kể cả 0 giờ OT', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([
      don({
        loaiDon: 'lam_them_gio',
        gioTu: '18:00',
        gioDen: '18:00',
        soGioOt: 0,
        heSoOt: 1.5,
      }),
    ]);

    render(<DonTuCuaToiPage />);

    expect(await screen.findByText(/0 giờ OT/)).toBeTruthy();
  });
});

describe('Đơn từ của tôi — huỷ đơn', () => {
  it('nút huỷ CHỈ có ở đơn còn chờ duyệt', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([
      don({ id: 'd1', trangThai: 'cho_duyet' }),
      don({ id: 'd2', trangThai: 'da_duyet' }),
      don({ id: 'd3', trangThai: 'tu_choi' }),
    ]);

    render(<DonTuCuaToiPage />);

    await waitFor(() => expect(screen.getAllByTestId('the-don')).toHaveLength(3));

    const the = screen.getAllByTestId('the-don');
    expect(within(the[0]).queryByRole('button', { name: 'Huỷ đơn' })).toBeTruthy();
    expect(within(the[1]).queryByRole('button', { name: 'Huỷ đơn' })).toBeNull();
    expect(within(the[2]).queryByRole('button', { name: 'Huỷ đơn' })).toBeNull();
  });

  it('xác nhận huỷ thì gọi huyDonCuaToi đúng id rồi nạp lại danh sách', async () => {
    const cuaToi = vi
      .spyOn(attendanceRequestService, 'cuaToi')
      .mockResolvedValue([don({ id: 'd-cho', trangThai: 'cho_duyet' })]);
    const huy = vi
      .spyOn(attendanceRequestService, 'huyDonCuaToi')
      .mockResolvedValue(undefined);

    render(<DonTuCuaToiPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ đơn' }));
    fireEvent.click(await screen.findByRole('button', { name: /Xác nhận huỷ/ }));

    await waitFor(() => expect(huy).toHaveBeenCalledWith('d-cho'));
    // Lần 1 lúc mount, lần 2 sau khi huỷ — không tự xoá khỏi mảng ở FE.
    await waitFor(() => expect(cuaToi).toHaveBeenCalledTimes(2));
  });

  it('huỷ hỏng (đơn vừa được duyệt ở nơi khác) thì báo nguyên văn câu backend', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([
      don({ id: 'd-cho', trangThai: 'cho_duyet' }),
    ]);
    vi.spyOn(attendanceRequestService, 'huyDonCuaToi').mockRejectedValue(
      loiBackend(403, 'Đơn đã được xử lý, không thể huỷ'),
    );

    render(<DonTuCuaToiPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Huỷ đơn' }));
    fireEvent.click(await screen.findByRole('button', { name: /Xác nhận huỷ/ }));

    expect(await screen.findByText('Đơn đã được xử lý, không thể huỷ')).toBeTruthy();
  });
});

describe('Đơn từ của tôi — nộp đơn', () => {
  async function moForm() {
    render(<DonTuCuaToiPage />);
    await screen.findByText('Chưa có đơn nào');
    fireEvent.click(screen.getByRole('button', { name: /Nộp đơn/ }));
    return await screen.findByLabelText('Lý do');
  }

  it('nghỉ phép: gửi đúng loaiDon và các trường của loại đơn đó, không thừa khoá', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([]);
    const tao = vi
      .spyOn(attendanceRequestService, 'taoDonCuaToi')
      .mockResolvedValue(don());

    const lyDo = await moForm();

    fireEvent.click(screen.getByRole('button', { name: 'Nghỉ phép' }));
    fireEvent.change(screen.getByLabelText('Từ ngày'), {
      target: { value: '2026-08-03' },
    });
    fireEvent.change(screen.getByLabelText('Đến ngày'), {
      target: { value: '2026-08-05' },
    });
    fireEvent.change(screen.getByLabelText('Loại nghỉ'), {
      target: { value: 'phep_nam' },
    });
    fireEvent.change(lyDo, { target: { value: 'Về quê' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi đơn/ }));

    await waitFor(() => expect(tao).toHaveBeenCalledTimes(1));
    // toStrictEqual, không phải toEqual: toEqual coi { a: 1, b: undefined }
    // và { a: 1 } là bằng nhau, nên nếu dungDtoNopDon() lỡ lọt một khoá
    // `key: undefined` vào payload, test này vẫn xanh — trong khi backend
    // forbidNonWhitelisted lại 400 vì thấy khoá đó (dù giá trị undefined).
    expect(tao.mock.calls[0][0]).toStrictEqual({
      loaiDon: 'nghi_phep',
      ngay: '2026-08-03',
      denNgay: '2026-08-05',
      loaiNghi: 'phep_nam',
      lyDo: 'Về quê',
    });
  });

  it('giải trình: form KHÔNG hiện đến ngày / loại nghỉ, và payload cũng không có', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([]);
    const tao = vi
      .spyOn(attendanceRequestService, 'taoDonCuaToi')
      .mockResolvedValue(don());

    const lyDo = await moForm();

    // giai_trinh là mặc định — kiểm luôn rằng form không vẽ trường của đơn nghỉ.
    expect(screen.queryByLabelText('Đến ngày')).toBeNull();
    expect(screen.queryByLabelText('Loại nghỉ')).toBeNull();
    expect(screen.getByLabelText('Từ giờ')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Ngày'), {
      target: { value: '2026-07-20' },
    });
    fireEvent.change(screen.getByLabelText('Từ giờ'), { target: { value: '08:00' } });
    fireEvent.change(screen.getByLabelText('Đến giờ'), { target: { value: '09:00' } });
    fireEvent.change(lyDo, { target: { value: 'Quên chấm công' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi đơn/ }));

    await waitFor(() => expect(tao).toHaveBeenCalledTimes(1));
    // toStrictEqual — xem giải thích ở test "nghỉ phép" phía trên.
    expect(tao.mock.calls[0][0]).toStrictEqual({
      loaiDon: 'giai_trinh',
      ngay: '2026-07-20',
      gioTu: '08:00',
      gioDen: '09:00',
      lyDo: 'Quên chấm công',
    });
  });

  it('ngày mặc định là hôm nay để đơn giải trình/OT chỉ cần gõ lý do', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([]);
    await moForm();
    expect((screen.getByLabelText('Ngày') as HTMLInputElement).value).toBe(homNayVN());
  });

  it('làm thêm giờ thiếu giờ → chặn tại FE, KHÔNG gọi service', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([]);
    const tao = vi
      .spyOn(attendanceRequestService, 'taoDonCuaToi')
      .mockResolvedValue(don());

    const lyDo = await moForm();

    fireEvent.click(screen.getByRole('button', { name: 'Làm thêm giờ' }));
    fireEvent.change(lyDo, { target: { value: 'Chạy deadline' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi đơn/ }));

    expect(
      await screen.findByText(/giờ bắt đầu và giờ kết thúc/),
    ).toBeTruthy();
    expect(tao).not.toHaveBeenCalled();
  });

  it('backend từ chối thì giữ form mở và hiện nguyên văn lý do', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockResolvedValue([]);
    vi.spyOn(attendanceRequestService, 'taoDonCuaToi').mockRejectedValue(
      loiBackend(400, 'Khoảng nghỉ không được vượt quá 60 ngày'),
    );

    const lyDo = await moForm();
    fireEvent.change(lyDo, { target: { value: 'Nghỉ dài' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi đơn/ }));

    expect(
      await screen.findByText('Khoảng nghỉ không được vượt quá 60 ngày'),
    ).toBeTruthy();
    // Form vẫn mở: đóng lại là người dùng mất hết những gì vừa gõ.
    expect((screen.getByLabelText('Lý do') as HTMLTextAreaElement).value).toBe('Nghỉ dài');
  });

  it('nộp thành công thì đóng form và nạp lại danh sách từ server', async () => {
    const cuaToi = vi
      .spyOn(attendanceRequestService, 'cuaToi')
      .mockResolvedValue([]);
    vi.spyOn(attendanceRequestService, 'taoDonCuaToi').mockResolvedValue(don());

    const lyDo = await moForm();
    fireEvent.change(lyDo, { target: { value: 'Quên chấm công' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi đơn/ }));

    // Nạp lại thay vì tự chèn: soNgayNghi/soGioOt/heSoOt do backend tính.
    await waitFor(() => expect(cuaToi).toHaveBeenCalledTimes(2));
    // Và form phải ĐÓNG — đây là điều tên test hứa hẹn ("đóng form"), không
    // chỉ suy ra được từ việc cuaToi gọi 2 lần. Nếu ai đó lỡ xoá dòng
    // `setState("formMo", false)` trong nop.handler.ts, cuaToi vẫn được gọi
    // 2 lần y hệt nhưng form vẫn còn mở — assert cũ không bắt được.
    expect(screen.queryByLabelText('Lý do')).toBeNull();
  });
});

describe('Đơn từ của tôi — lỗi tải', () => {
  it('hiện thông báo lỗi kèm nút thử lại, KHÔNG hiện "Chưa có đơn nào"', async () => {
    const cuaToi = vi
      .spyOn(attendanceRequestService, 'cuaToi')
      .mockRejectedValue(loiBackend(500, 'Không kết nối được máy chủ'));

    render(<DonTuCuaToiPage />);

    expect(await screen.findByText('Không tải được danh sách đơn')).toBeTruthy();
    expect(screen.getByText('Không kết nối được máy chủ')).toBeTruthy();
    // Đây là cái bẫy cũ: rỗng vì lỗi trông y hệt rỗng vì chưa nộp đơn nào.
    expect(screen.queryByText('Chưa có đơn nào')).toBeNull();

    cuaToi.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(await screen.findByText('Chưa có đơn nào')).toBeTruthy();
  });

  it('404 (tài khoản chưa gắn hồ sơ nhân viên) nói rõ phải liên hệ HR', async () => {
    vi.spyOn(attendanceRequestService, 'cuaToi').mockRejectedValue(
      loiBackend(404, 'Không tìm thấy nhân viên'),
    );

    render(<DonTuCuaToiPage />);

    expect(await screen.findByText(/chưa được gắn với hồ sơ nhân viên/)).toBeTruthy();
  });
});
