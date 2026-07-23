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
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ChamCongCuaToiPage from './ChamCongCuaToiPage';
import {
  attendanceRecordService,
  AttendanceRecord,
  TrangThaiHomNay,
} from '@/services/attendanceRecordService';
import { ApiError, ApiErrorType } from '@/config/api';
import { bayNgayTu, dauTuanCua } from './lichTuan';
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
    ngayCong: '2026-07-22',
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
    soCong: 0,
    diaDiem: [],
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
  // init() giờ bắn napTuan() ngay khi mount. Các test ở đây khoá 7 nhánh
  // trạng thái của nút chấm công, không quan tâm lịch tuần — mock để không
  // tạo request thật (và không log lỗi network) trên mỗi test.
  vi.spyOn(attendanceRecordService, 'cuaToi').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Chấm công của tôi — đường hạnh phúc', () => {
  it('hiện nút "Chấm công" (chiều vào) và ghi nhận thành công', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    const checkIn = vi
      .spyOn(attendanceRecordService, 'checkIn')
      .mockResolvedValue(banGhiMau());

    render(<ChamCongCuaToiPage />);

    const nut = await screen.findByRole('button', { name: /Chấm công$/ });
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

  it('tin hanhDongKeTiep của backend: "ra" → bấm nút gọi checkOut', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    await waitFor(() => expect(checkOut).toHaveBeenCalledTimes(1));
  });
});

/**
 * Ca 22:00–06:00, nhân viên mở app lúc 00:30. Trước đây danh sách lọc theo
 * ngày lịch hôm nay còn nút suy từ bản ghi cuối bất kể ngày, nên màn hình tự
 * mâu thuẫn: nút "Chấm công RA" nằm ngay trên dòng "Chưa có lượt chấm công
 * nào" — đọc như hệ thống vừa mất dữ liệu. Hai phần phải kể cùng một câu
 * chuyện.
 */
describe('Chấm công của tôi — ca qua đêm', () => {
  it('lượt vào mở từ hôm trước: hiện đúng lượt đó, KHÔNG báo rỗng', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({
        ngay: '2026-07-23',
        ngayCong: '2026-07-22',
        hanhDongKeTiep: 'ra',
        banGhi: [
          banGhiMau({
            ngay: '2026-07-22',
            loai: 'vao',
            thoiDiem: '2026-07-22T15:02:00.000Z', // 22:02 giờ VN
            soPhutDiMuon: 2,
          }),
        ],
      }),
    );

    render(<ChamCongCuaToiPage />);

    expect(await screen.findByRole('button', { name: /Chấm công$/ })).toBeTruthy();
    expect(screen.queryByText('Chưa có lượt chấm công nào')).toBeNull();
    // Tiêu đề nói rõ đây là ca của ngày công hôm trước, không đề ngày hôm nay.
    expect(screen.getByText(/Chi tiết ca ngày 2026-07-22 \(chưa kết thúc\)/)).toBeTruthy();
  });

  it('ngày thường thì khối chi tiết đề tiêu đề chung, không kèm "(chưa kết thúc)"', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({ banGhi: [banGhiMau()] }),
    );

    render(<ChamCongCuaToiPage />);

    expect(await screen.findByText(/Chi tiết chấm công/)).toBeTruthy();
    expect(screen.queryByText(/chưa kết thúc/)).toBeNull();
  });
});

describe('Chấm công của tôi — ngoài vùng KHÔNG phải lỗi', () => {
  it('hiện màu vàng, nói rõ đã ghi nhận và không cần chấm lại', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockResolvedValue(
      banGhiMau({ ngoaiVung: true, khoangCachMet: 842.4, locationTen: undefined }),
    );

    const { container } = render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

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
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

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
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

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
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    expect(await screen.findByText(mong)).toBeTruthy();
    expect(screen.queryByText(/Có lỗi xảy ra\. Vui lòng thử lại\./)).toBeNull();
    // Cả 3 đều phải liên hệ HR — bấm lại không đổi được gì.
    expect(screen.queryByRole('button', { name: /Chấm công$/ })).toBeNull();
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
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    expect(await screen.findByText(cau)).toBeTruthy();
  });
});

describe('Chấm công của tôi — vị trí và sai thứ tự', () => {
  it('người dùng chặn quyền vị trí → hướng dẫn bật lại, nút chấm VẪN CÒN để thử lại', async () => {
    tuChoiGps();
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    const checkIn = vi.spyOn(attendanceRecordService, 'checkIn');

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    expect(await screen.findByText(/chưa được cấp quyền vị trí/)).toBeTruthy();
    // Không gọi API khi chưa có vị trí — tránh đẻ ra bản ghi thiếu toạ độ.
    expect(checkIn).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Chấm công$/ })).toBeTruthy();
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
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    expect(await screen.findByText(cau)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Chấm công$/ })).toBeTruthy();
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
    expect(screen.queryByRole('button', { name: /Chấm công$/ })).toBeNull();
  });

  it('404 lúc mở màn hình → dải lịch tuần cũng ẩn theo, không nổi lên rỗng trên thông báo chặn', async () => {
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

    await screen.findByText(/chưa được gắn với hồ sơ nhân viên/);
    // `homNay` là null trên nhánh chặn — dải 7 ngày với nút ‹ › điều hướng
    // không được phép nổi lên rỗng ngay trên thông báo chặn, đọc như nửa
    // trang còn dùng được trong khi cả màn hình đang khoá.
    expect(screen.queryByRole('button', { name: 'Tuần trước' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tuần sau' })).toBeNull();
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
    expect(screen.queryByRole('button', { name: /Chấm công$/ })).toBeNull();

    fireEvent.click(nut);
    expect(await screen.findByRole('button', { name: /Chấm công$/ })).toBeTruthy();
    expect(homNay).toHaveBeenCalledTimes(2);
  });
});

describe('Chấm công của tôi — ba ô trạng thái và lịch tuần', () => {
  it('hiện ba ô trạng thái với giờ vào đã chấm', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({
        banGhi: [
          {
            id: 'r1', employeeId: 'emp-1', ngay: '2026-07-22', loai: 'vao',
            thoiDiem: '2026-07-22T01:02:00.000Z', ngoaiVung: false,
            soPhutDiMuon: 2, soPhutVeSom: 0, laNgayNghi: false, nguonTao: 'tu_cham',
          },
        ],
        soCong: null,
        hanhDongKeTiep: 'ra',
      })
    );

    const { container } = render(<ChamCongCuaToiPage />);

    // Cùng bản ghi còn hiện lại trong khối chi tiết (thu gọn nhưng vẫn có
    // trong DOM) nên "08:02" và "Muộn 2 phút" đều xuất hiện 2 lần (ô ba
    // trạng thái + dòng chi tiết của chính lượt đó) — khoanh vùng vào ô ba
    // trạng thái (`.grid-cols-3`) để không lẫn với chi tiết.
    await waitFor(() =>
      expect(screen.getByText('08:02', { selector: '.text-xl' })).toBeTruthy()
    );
    const baO = container.querySelector('.grid-cols-3') as HTMLElement;
    expect(within(baO).getByText('Muộn 2 phút')).toBeTruthy();
    expect(within(baO).getByText('Chờ ra')).toBeTruthy();
  });

  it('shift card hiện tên địa điểm khi công ty chỉ có một điểm', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({ diaDiem: [{ id: 'l1', ten: 'Văn phòng HN', loai: 'gps', banKinh: 100 }] })
    );

    render(<ChamCongCuaToiPage />);

    await waitFor(() => expect(screen.getByText('📍 Văn phòng HN')).toBeTruthy());
    expect(screen.getByText('Bán kính 100m')).toBeTruthy();
  });

  it('nhiều địa điểm thì hiện số lượng, không bịa ra một điểm', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({
        diaDiem: [
          { id: 'l1', ten: 'Văn phòng HN', loai: 'gps', banKinh: 100 },
          { id: 'l2', ten: 'Chi nhánh HCM', loai: 'gps', banKinh: 50 },
        ],
      })
    );

    render(<ChamCongCuaToiPage />);

    await waitFor(() => expect(screen.getByText('📍 2 địa điểm được phép')).toBeTruthy());
    expect(screen.queryByText('Bán kính 100m')).toBeNull();
  });

  /**
   * Lịch tuần hỏng KHÔNG được kéo theo nút chấm công. Đây là nhánh dễ vỡ
   * nhất khi vẽ lại theo mockup — mockup chỉ vẽ đường hạnh phúc.
   */
  it('lỗi tải lịch tuần không chặn nút chấm công', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    const cuaToi = vi
      .spyOn(attendanceRecordService, 'cuaToi')
      .mockRejectedValue(new Error('mạng hỏng'));
    // tuan.handler.ts cố ý console.error khi lịch tuần hỏng — đúng, nhưng
    // một test XANH không được phép in ra stack trace; khoá lại và trả về
    // sau khi test xong, không để rò sang các test khác.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(<ChamCongCuaToiPage />);

    await waitFor(() => expect(screen.getByText(/^Chấm công$/)).toBeTruthy());
    // Chỉ khoá được nút chấm công thì chưa đủ để chứng minh `cuaToi` thật sự
    // bị gọi và lỗi thật sự được bắt — dải lịch tuần phải rơi về "toàn xám"
    // (dọn về mảng rỗng), không phải bịa dữ liệu hay treo nửa vời.
    const cham = container.querySelectorAll('.rounded-full');
    expect(cham).toHaveLength(7);
    cham.forEach((el) => {
      expect((el as HTMLElement).style.background).toBe('var(--emp-border)');
    });
    // Không có dòng này thì test xanh kể cả khi napTuan không bao giờ chạy:
    // `banGhiTuan` mặc định đã là [] nên dải lịch xám sẵn, không phân biệt được
    // "đã gọi rồi nuốt lỗi" với "chưa từng gọi".
    await waitFor(() => expect(cuaToi).toHaveBeenCalled());

    consoleError.mockRestore();
  });

  /**
   * Finding 2a: tới giờ chỉ có nhánh LỖI của `napTuan` được khoá bằng test
   * (dải toàn xám). Chưa có gì chứng minh rằng bản ghi NẠP ĐƯỢC thật sự tô
   * đúng màu — đúng thứ sẽ bắt được kiểu lỗi ở Finding 1 (dải đứng yên với
   * dữ liệu cũ trong khi ba ô trạng thái đã đổi).
   */
  it('tuần nạp được: đủ vào+ra tô xanh, chỉ có vào tô đỏ', async () => {
    const dauTuan = dauTuanCua(homNayVN());
    const ngay = bayNgayTu(dauTuan);

    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'cuaToi').mockResolvedValue([
      banGhiMau({ id: 'w1', ngay: ngay[0], loai: 'vao' }),
      banGhiMau({ id: 'w2', ngay: ngay[0], loai: 'ra' }),
      banGhiMau({ id: 'w3', ngay: ngay[1], loai: 'vao' }),
    ]);

    const { container } = render(<ChamCongCuaToiPage />);

    await waitFor(() => expect(screen.getByText(/Chấm công/)).toBeTruthy());
    const cham = container.querySelectorAll('.rounded-full');
    expect(cham).toHaveLength(7);
    // Có vào + ra trong ngày → xanh (var(--emp-accent)); ngày kế chỉ có vào,
    // chưa ra → đỏ (var(--emp-danger)). Đây là hai màu người dùng phân biệt
    // được "đã xong ca" với "đang mở ca", nên phải đúng ô đúng màu.
    await waitFor(() =>
      expect((cham[0] as HTMLElement).style.background).toBe('var(--emp-accent)'),
    );
    expect((cham[1] as HTMLElement).style.background).toBe('var(--emp-danger)');
  });
});

/**
 * Finding 1: `taiLaiHomNay()` chỉ nạp lại ba ô trạng thái, KHÔNG có gì nạp
 * lại dải lịch tuần — nên sau một cú chấm công thành công, ba ô trạng thái
 * đổi (VD "08:02 / Chờ ra") trong khi chấm hôm nay trên dải tuần vẫn đứng
 * yên với dữ liệu cũ (xám). Xoá đoạn `napTuan` trong `cham.handler.ts` là
 * test này FAIL ngay — `cuaToi` sẽ chỉ được gọi 1 lần lúc mount.
 */
describe('Chấm công của tôi — dải lịch tuần đồng bộ sau khi chấm công', () => {
  it('chấm công VÀO thành công → nạp lại lịch tuần (cuaToi được gọi thêm lần nữa)', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockResolvedValue(banGhiMau());
    const cuaToi = vi.spyOn(attendanceRecordService, 'cuaToi').mockResolvedValue([]);

    render(<ChamCongCuaToiPage />);

    // Lần nạp đầu tiên là lúc `init` mount trang.
    await waitFor(() => expect(cuaToi).toHaveBeenCalledTimes(1));

    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    expect(await screen.findByText(/Đã chấm công vào thành công/)).toBeTruthy();
    // Lần nạp thứ hai phải xảy ra SAU khi chấm công thành công — nếu không,
    // dải lịch tuần và ba ô trạng thái kể hai câu chuyện khác nhau về cùng
    // một cú bấm.
    await waitFor(() => expect(cuaToi).toHaveBeenCalledTimes(2));
  });
});

describe('Chấm công của tôi — chi tiết từng lượt chấm', () => {
  it('bản ghi HR nhập không có phuongThuc thì KHÔNG bịa ra "QR"', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({
        banGhi: [banGhiMau({ nguonTao: 'hr_nhap', phuongThuc: undefined })],
      }),
    );

    render(<ChamCongCuaToiPage />);

    // Bản ghi HR nhập bù không có phương thức tự chấm nào cả — hiện "QR" ở
    // đây là bịa, và đứng cạnh "HR nhập" thì hai chữ tự mâu thuẫn nhau.
    await waitFor(() => expect(screen.getByText(/HR nhập/)).toBeTruthy());
    expect(screen.queryByText(/QR/)).toBeNull();
    expect(screen.queryByText(/GPS/)).toBeNull();
    expect(screen.queryByText(/Wifi/)).toBeNull();
  });

  it('lượt vào thứ hai trong ngày bị muộn thì hiện muộn ngay trên chính lượt đó', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({
        banGhi: [
          banGhiMau({
            id: 'bg-1',
            loai: 'vao',
            thoiDiem: '2026-07-22T01:05:00.000Z', // 08:05 giờ VN
            soPhutDiMuon: 5,
          }),
          banGhiMau({
            id: 'bg-2',
            loai: 'ra',
            thoiDiem: '2026-07-22T04:00:00.000Z', // 11:00 giờ VN
            soPhutVeSom: 0,
          }),
          banGhiMau({
            id: 'bg-3',
            loai: 'vao',
            thoiDiem: '2026-07-22T06:00:00.000Z', // 13:00 giờ VN
            soPhutDiMuon: 20,
          }),
        ],
      }),
    );

    render(<ChamCongCuaToiPage />);

    // Ô ba trạng thái chỉ nói được về lượt vào ĐẦU TIÊN (Muộn 5 phút); lượt
    // vào thứ hai muộn 20 phút chỉ có chi tiết từng lượt mới kể được.
    await waitFor(() => expect(screen.getByText('Muộn 20 phút')).toBeTruthy());
  });
});

/**
 * Task 5: nút theo mockup (dòng 274) chỉ có MỘT nhãn "Chấm công" — ba ô
 * trạng thái ngay trên đã nói rõ đang thiếu vào hay thiếu ra, chữ VÀO/RA
 * trên nút là thừa. Mockup còn vẽ disabled "Đã chấm đủ" (dòng 381) nhưng cố
 * ý KHÔNG làm theo: ai lỡ bấm ra sớm sẽ bị khoá cả ngày, phải nhờ HR nhập
 * bù. Cho bấm lại thì tự lành.
 */
describe('Chấm công của tôi — nút một nhãn theo mockup, không bao giờ tắt', () => {
  it('nút luôn ghi "Chấm công", không phải VÀO/RA', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());

    render(<ChamCongCuaToiPage />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Chấm công$/ })).toBeTruthy());
    expect(screen.queryByText(/Chấm công VÀO|Chấm công RA/)).toBeNull();
  });

  /**
   * Mockup vẽ nút disabled "Đã chấm đủ", nhưng cố ý không làm theo: ai lỡ bấm
   * ra sớm sẽ bị khoá cả ngày và phải nhờ HR. Cho bấm lại thì tự lành.
   */
  it('đủ công → nút VẪN bấm được, kèm dòng nhắc cập nhật giờ ra', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(
      homNayMau({
        banGhi: [
          { id: 'r1', employeeId: 'e1', ngay: '2026-07-22', loai: 'vao', thoiDiem: '2026-07-22T01:00:00.000Z', ngoaiVung: false, soPhutDiMuon: 0, soPhutVeSom: 0, laNgayNghi: false, nguonTao: 'tu_cham' },
          { id: 'r2', employeeId: 'e1', ngay: '2026-07-22', loai: 'ra', thoiDiem: '2026-07-22T10:00:00.000Z', ngoaiVung: false, soPhutDiMuon: 0, soPhutVeSom: 0, laNgayNghi: false, nguonTao: 'tu_cham' },
        ],
        soCong: 1,
        hanhDongKeTiep: 'ra',
      })
    );

    render(<ChamCongCuaToiPage />);

    const nut = await screen.findByRole('button', { name: /Chấm công$/ });
    // Dự án này KHÔNG cài @testing-library/jest-dom (không có setup file nào
    // mở rộng matcher) nên `toBeDisabled()` không tồn tại — đọc thẳng thuộc
    // tính DOM `disabled`, đúng cách columnFilterDropdown.render.test.tsx đã
    // làm ở chỗ khác trong repo.
    expect((nut as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/bấm lại nếu cần cập nhật giờ ra/i)).toBeTruthy();
  });

  it('ngoài bán kính → hiện câu backend và nút vẫn còn', async () => {
    vi.spyOn(attendanceRecordService, 'homNay').mockResolvedValue(homNayMau());
    vi.spyOn(attendanceRecordService, 'checkIn').mockRejectedValue(
      loiBackend(403, 'NGOAI_BAN_KINH_CHO_PHEP', 'Bạn đang cách 480m')
    );

    render(<ChamCongCuaToiPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Chấm công$/ }));

    await waitFor(() => expect(screen.getByText(/480m/)).toBeTruthy());
    expect(screen.getByRole('button', { name: /Chấm công$/ })).toBeTruthy();
  });
});
