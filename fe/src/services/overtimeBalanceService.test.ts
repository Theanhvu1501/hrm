import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { overtimeBalanceService } from './overtimeBalanceService';

/**
 * (review nhánh, CRITICAL 1) Bài test này CỐ Ý không mock `ServiceBase.get`
 * như `attendanceRequestService.test.ts` làm.
 *
 * Mock ở tầng `ServiceBase.get` bỏ qua đúng đoạn code đã hỏng:
 * `parseResponse()` — hàm kết thúc bằng `return response.data as T`. Backend
 * `quy-gio.controller.ts` trước đây trả object THÔ (không bọc
 * `{ success: true, data }`), nên `parseResponse()` đọc `response.data` ra
 * `undefined` và MỌI lời gọi ở đây resolve thành `undefined` — banner số dư
 * nổ TypeError (bị `.catch()` nuốt) và màn HR `.map` trên `undefined`.
 *
 * Nên mock đặt ở tầng THẤP NHẤT còn kiểm soát được: `client` (axios instance
 * private của ServiceBase). Thân phản hồi đưa vào đây là thân THẬT mà backend
 * gửi đi sau bản vá — nếu ai đó bóc lớp `{ success, data }` khỏi controller
 * lần nữa, bài test này đỏ.
 */
type ThanPhanHoi = Record<string, unknown>;

function giaAxios(than: ThanPhanHoi) {
  const get = vi.fn(async () => ({ data: than }));
  (overtimeBalanceService as unknown as { client: { get: unknown } }).client.get =
    get;
  return get;
}

const clientGoc = (
  overtimeBalanceService as unknown as { client: { get: unknown } }
).client.get;

afterEach(() => {
  (overtimeBalanceService as unknown as { client: { get: unknown } }).client.get =
    clientGoc;
});

describe('overtimeBalanceService — bóc đúng phong bì { success, data } của backend', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('soDuCuaToi() đọc được số dư từ thân ĐÃ BỌC', async () => {
    giaAxios({
      success: true,
      data: {
        soGioConLai: 8.33,
        theoKy: [
          { kyTich: '2026-01', hanDung: '2026-07-31', soGioConLai: 8.33 },
        ],
      },
    });

    const kq = await overtimeBalanceService.soDuCuaToi();

    expect(kq.soGioConLai).toBe(8.33);
    expect(kq.theoKy).toEqual([
      { kyTich: '2026-01', hanDung: '2026-07-31', soGioConLai: 8.33 },
    ]);
  });

  it('soDuCuaNhanVien() đọc được số dư từ thân ĐÃ BỌC', async () => {
    const get = giaAxios({
      success: true,
      data: { soGioConLai: 4, theoKy: [] },
    });

    const kq = await overtimeBalanceService.soDuCuaNhanVien('nv1');

    expect(kq.soGioConLai).toBe(4);
    expect(get).toHaveBeenCalledWith(
      '/config/quy-gio/nv1/so-du',
      expect.anything(),
    );
  });

  it('layTheoNhanVien() map được danh sách từ thân ĐÃ BỌC (_id → id)', async () => {
    giaAxios({
      success: true,
      data: [
        {
          _id: 'q1',
          employeeId: 'nv1',
          kyTich: '2026-01',
          soGioTich: 12,
          soGioDaDung: 0,
          soGioDangChoDuyet: 0,
          soGioConLai: 12,
          hanDung: '2026-07-31',
          trangThai: 'dang_hieu_luc',
        },
      ],
    });

    const kq = await overtimeBalanceService.layTheoNhanVien('nv1');

    expect(kq).toHaveLength(1);
    expect(kq[0]).toMatchObject({ id: 'q1', kyTich: '2026-01', soGioTich: 12 });
  });

  /**
   * Đây là bài kiểm HỒI QUY trực tiếp cho CRITICAL 1: dựng lại đúng thân THÔ
   * mà controller trả trước bản vá và khẳng định nó KHÔNG dùng được. Nếu ai
   * đó "sửa" bằng cách nới `parseResponse()` cho nhận cả hai hình dạng, bài
   * này sẽ đỏ và buộc phải bàn lại — hợp đồng của repo là mọi controller đều
   * bọc, không phải FE đoán hai kiểu.
   */
  it('thân THÔ (không bọc) — hình dạng trước bản vá — cho ra số dư rỗng, chứng minh route đã chết', async () => {
    giaAxios({ soGioConLai: 8.33, theoKy: [{ kyTich: '2026-01' }] });

    // `parseResponse` trả `undefined`; `transform(undefined)` ném TypeError.
    await expect(overtimeBalanceService.soDuCuaToi()).rejects.toThrow(TypeError);
  });

  it('thân THÔ (không bọc) cho danh sách — .map trên undefined, màn HR trắng dữ liệu', async () => {
    giaAxios([{ _id: 'q1' }] as unknown as ThanPhanHoi);

    await expect(overtimeBalanceService.layTheoNhanVien('nv1')).rejects.toThrow(
      TypeError,
    );
  });
});
