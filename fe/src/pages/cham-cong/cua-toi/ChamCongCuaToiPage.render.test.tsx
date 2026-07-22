// @vitest-environment jsdom
/**
 * Khoá 7 nhánh trạng thái của màn hình chấm công bằng test render.
 *
 * Đường hạnh phúc chỉ là một nhánh; các nhánh lỗi mới là thứ quyết định
 * người dùng thấy hệ thống dễ chịu hay khó chịu — và là thứ không ai mở
 * trình duyệt ra thử lại mỗi lần sửa code.
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChamCongCuaToiPage from './ChamCongCuaToiPage';
import {
  attendanceRecordService,
  AttendanceRecord,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';
import { ApiError, ApiErrorType } from '@/config/api';

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

/**
 * Lỗi đúng hình dạng GlobalExceptionFilter trả về qua gateway. `message` ở
 * đây khớp với những gì `ServiceBase.handleError()` (đã vá, đọc
 * `data.error.message`) thật sự đặt vào `ApiError.message` — không còn là
 * chuỗi chung chung "Request failed with status code ..." của axios.
 */
function loiBackend(status: number, code: string, message: string) {
  return new ApiError(message, ApiErrorType.FORBIDDEN, status, {
    response: { status, data: { success: false, error: { code, message } } },
  });
}

function homNayMau(over: Partial<TrangThaiHomNay> = {}): TrangThaiHomNay {
  return {
    ngay: '2026-07-22',
    nhanVien: { id: 'emp-1', hoTen: 'Nguyễn Văn Hải', employeeCode: 'NV0001' },
    ca: {
      id: 'ca-1',
      ten: 'Ca hành chính',
      gioBatDau: '08:00',
      gioKetThuc: '17:00',
      laCaQuaDem: false,
    },
    hanhDongKeTiep: 'vao',
    banGhi: [],
    ...over,
  };
}

function banGhiMau(over: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: 'bg-1',
    employeeId: 'emp-1',
    ngay: '2026-07-22',
    loai: 'vao',
    thoiDiem: '2026-07-22T01:05:00.000Z', // 08:05 giờ VN
    locationTen: 'Trụ sở chính',
    ngoaiVung: false,
    soPhutDiMuon: 5,
    soPhutVeSom: 0,
    laNgayNghi: false,
    nguonTao: 'tu_cham',
    ...over,
  };
}

function capGps(toado = { latitude: 21.02, longitude: 105.83, accuracy: 10 }) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords: toado } as GeolocationPosition),
    },
  });
}

function tuChoiGps() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) =>
        fail({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'User denied Geolocation',
        } as GeolocationPositionError),
    },
  });
}

beforeEach(() => {
  capGps();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Chấm công của tôi — đường hạnh phúc', () => {
  it('hiện nút "Chấm công VÀO" và ghi nhận thành công', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    const checkIn = vi
      .spyOn(attendanceRecordService, 'checkIn')
      .mockResolvedValue(banGhiMau());

    render(<ChamCongCuaToiPage />);

    const nut = await screen.findByRole('button', { name: /Chấm công VÀO/ });
    fireEvent.click(nut);

    expect(await screen.findByText(/Đã chấm công vào thành công/)).toBeTruthy();
    // Giờ hiện ra phải theo múi giờ VN, không theo múi giờ máy chạy test.
    expect(screen.getByText(/Ghi lúc 08:05/)).toBeTruthy();
    expect(checkIn).toHaveBeenCalledTimes(1);

    const dto = checkIn.mock.calls[0][0];
    expect(dto.phuongThuc).toBe('gps');
    expect(dto.latitude).toBe(21.02);
    expect(dto.doChinhXacMet).toBe(10);
    // deviceId luôn phải có — lấy qua getDeviceId(), không đọc localStorage.
    expect(dto.deviceId).toBeTruthy();
    // Tên máy luôn được gửi kèm để dòng chờ duyệt tự sinh của BE không trống.
    expect(dto.tenThietBi).toBeTruthy();
  });

  it('tin hanhDongKeTiep của backend: "ra" → hiện nút RA và gọi checkOut', async () => {
    // Danh sách bản ghi hôm nay RỖNG nhưng backend vẫn bảo "ra" (lượt vào mở
    // từ hôm qua, ca qua đêm). Nếu FE tự suy từ banGhi thì sẽ hiện nút VÀO và
    // đẩy người dùng thẳng vào lỗi 409.
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({ hanhDongKeTiep: 'ra', banGhi: [] }),
    );
    const checkOut = vi
      .spyOn(attendanceRecordService, 'checkOut')
      .mockResolvedValue(banGhiMau({ loai: 'ra' }));

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công RA/ }));

    await waitFor(() => expect(checkOut).toHaveBeenCalledTimes(1));
  });
});

describe('Chấm công của tôi — ngoài vùng KHÔNG phải lỗi', () => {
  it('hiện màu vàng, nói rõ đã ghi nhận và không cần chấm lại', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockResolvedValue(
      banGhiMau({ ngoaiVung: true, khoangCachMet: 842.4, locationTen: undefined }),
    );

    const { container } = render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    const tieuDe = await screen.findByText(/Đã ghi nhận — ngoài khu vực cho phép/);
    expect(tieuDe).toBeTruthy();
    expect(screen.getByText(/Không cần chấm lại/)).toBeTruthy();
    expect(screen.getByText(/khoảng 842m/)).toBeTruthy();

    // Vàng (warning), KHÔNG đỏ (error): hiện như lỗi thì người dùng sẽ bấm
    // lại nhiều lần và tạo rác.
    expect(container.querySelector('.ant-alert-warning')).toBeTruthy();
    expect(container.querySelector('.ant-alert-error')).toBeNull();
  });
});

describe('Chấm công của tôi — thiết bị chưa được phép có LỐI THOÁT', () => {
  it('hiện ô đặt tên máy + nút gửi HR duyệt, và gửi đúng tên đã nhập', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    const checkIn = vi
      .spyOn(attendanceRecordService, 'checkIn')
      .mockRejectedValue(
        loiBackend(
          403,
          'THIET_BI_CHUA_DUOC_PHEP',
          'Thiết bị này chưa được phép chấm công. Yêu cầu đã gửi HR duyệt.',
        ),
      );

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    const nutGui = await screen.findByRole('button', {
      name: /Gửi HR duyệt máy này/,
    });
    const o = screen.getByPlaceholderText(/iPhone của Hải/);
    fireEvent.change(o, { target: { value: 'Điện thoại của Hải' } });
    fireEvent.click(nutGui);

    await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(2));
    expect(checkIn.mock.calls[1][0].tenThietBi).toBe('Điện thoại của Hải');
  });

  it('thiết bị bị từ chối là ngõ cụt thật → KHÔNG mời bấm gửi HR duyệt', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockRejectedValue(
      loiBackend(403, 'THIET_BI_BI_TU_CHOI', 'Thiết bị này đã bị từ chối. Liên hệ HR.'),
    );

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    expect(await screen.findByText(/đã bị HR từ chối/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Gửi HR duyệt máy này/ })).toBeNull();
  });
});

describe('Chấm công của tôi — 3 mã lỗi thiết bị backend thêm sau brief', () => {
  const bang: Array<[string, RegExp]> = [
    ['THIET_BI_THIEU_DINH_DANH', /chưa tạo được định danh thiết bị/],
    ['THIET_BI_DU_LIEU_BAT_NHAT', /nhiều hơn một thiết bị được duyệt/],
    ['THIET_BI_TRANG_THAI_KHONG_HOP_LE', /trạng thái không hợp lệ/i],
  ];

  it.each(bang)('%s hiện thông báo riêng, không rơi vào "vui lòng thử lại"', async (
    code,
    mong,
  ) => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockRejectedValue(
      loiBackend(403, code, 'thông điệp kỹ thuật của backend'),
    );

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    expect(await screen.findByText(mong)).toBeTruthy();
    expect(screen.queryByText(/Có lỗi xảy ra\. Vui lòng thử lại\./)).toBeNull();
    // Cả 3 đều phải liên hệ HR — bấm lại không đổi được gì.
    expect(screen.queryByRole('button', { name: /Chấm công VÀO/ })).toBeNull();
  });
});

describe('Chấm công của tôi — nhân viên đã nghỉ việc', () => {
  it('403 không kèm mã thiết bị → hiện NGUYÊN VĂN câu backend, không phải "lỗi không rõ"', async () => {
    const cau =
      'Hồ sơ nhân viên đã ở trạng thái nghỉ việc nên không thể chấm công. ' +
      'Nếu bạn vẫn đang làm việc, liên hệ HR để cập nhật lại trạng thái hồ sơ.';
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockRejectedValue(
      loiBackend(403, 'FORBIDDEN', cau),
    );

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    expect(await screen.findByText(cau)).toBeTruthy();
  });
});

describe('Chấm công của tôi — vị trí và sai thứ tự', () => {
  it('người dùng chặn quyền vị trí → hướng dẫn bật lại, nút chấm VẪN CÒN để thử lại', async () => {
    tuChoiGps();
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    const checkIn = vi.spyOn(attendanceRecordService, 'checkIn');

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    expect(await screen.findByText(/chưa được cấp quyền vị trí/)).toBeTruthy();
    // Không gọi API khi chưa có vị trí — tránh đẻ ra bản ghi thiếu toạ độ.
    expect(checkIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Chấm công VÀO/ })).toBeTruthy();
  });

  it('409 sai thứ tự → hiện câu backend (nêu đích danh ngày cần HR nhập bù)', async () => {
    const cau =
      'Lượt check-in ngày 2026-07-20 chưa được đóng và đã quá hạn để tự check-out.';
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockRejectedValue(
      new ApiError(cau, ApiErrorType.UNKNOWN_ERROR, 409, {
        response: {
          status: 409,
          data: { success: false, error: { code: 'CONFLICT', message: cau } },
        },
      }),
    );

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công VÀO/ }));

    expect(await screen.findByText(cau)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Chấm công VÀO/ })).toBeTruthy();
  });
});

describe('Chấm công của tôi — chưa liên kết hồ sơ', () => {
  it('404 lúc mở màn hình → nói rõ phải liên hệ HR, không hiện nút chấm', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockRejectedValue(
      new ApiError('Request failed with status code 404', ApiErrorType.NOT_FOUND, 404, {
        response: {
          status: 404,
          data: {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Tài khoản chưa được liên kết với hồ sơ nhân viên.',
            },
          },
        },
      }),
    );

    render(<ChamCongCuaToiPage />);

    expect(await screen.findByText(/chưa được gắn với hồ sơ nhân viên/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Chấm công VÀO/ })).toBeNull();
  });

  it('mất mạng lúc mở màn hình → hiện nút Thử lại, không đoán chiều vào/ra', async () => {
    const homNay = vi
      .spyOn(attendanceRecordService, 'homNay')
      .mockRejectedValueOnce(
        new ApiError('Network error', ApiErrorType.NETWORK_ERROR, undefined, {}),
      )
      .mockResolvedValueOnce(homNayMau());

    render(<ChamCongCuaToiPage />);

    const nut = await screen.findByRole('button', { name: /Thử lại/ });
    // Không được hiện nút Check-out "phòng hờ": đoán sai chiều là đẩy thẳng
    // người dùng vào lỗi 409.
    expect(screen.queryByRole('button', { name: /Chấm công RA/ })).toBeNull();

    fireEvent.click(nut);
    expect(await screen.findByRole('button', { name: /Chấm công VÀO/ })).toBeTruthy();
    expect(homNay).toHaveBeenCalledTimes(2);
  });
});
