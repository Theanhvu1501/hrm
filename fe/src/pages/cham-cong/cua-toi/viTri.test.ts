import { describe, it, expect, afterEach, vi } from 'vitest';
import { layViTri, LoiViTri } from './viTri';
import { TrangThai } from './trangThai';

/** Mã lỗi của GeolocationPositionError, theo chuẩn W3C. */
const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;
const TIMEOUT = 3;

function gaGeolocation(
  impl: (ok: PositionCallback, fail?: PositionErrorCallback) => void,
) {
  vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: impl } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('layViTri', () => {
  it('lấy được toạ độ → trả latitude/longitude/độ chính xác', async () => {
    gaGeolocation((ok) =>
      ok({
        coords: { latitude: 21.0278, longitude: 105.8342, accuracy: 12.5 },
      } as GeolocationPosition),
    );

    await expect(layViTri()).resolves.toEqual({
      latitude: 21.0278,
      longitude: 105.8342,
      doChinhXacMet: 12.5,
    });
  });

  it('người dùng từ chối quyền → TU_CHOI_VI_TRI (câu hướng dẫn bật lại quyền)', async () => {
    gaGeolocation((_ok, fail) =>
      fail?.({
        code: PERMISSION_DENIED,
        PERMISSION_DENIED,
        POSITION_UNAVAILABLE,
        TIMEOUT,
        message: 'User denied Geolocation',
      } as GeolocationPositionError),
    );

    await expect(layViTri()).rejects.toMatchObject({
      trangThai: TrangThai.TU_CHOI_VI_TRI,
    });
  });

  it('GPS tắt / hết thời gian chờ → LOI_VI_TRI, không đổ lỗi cho quyền', async () => {
    for (const code of [POSITION_UNAVAILABLE, TIMEOUT]) {
      gaGeolocation((_ok, fail) =>
        fail?.({
          code,
          PERMISSION_DENIED,
          POSITION_UNAVAILABLE,
          TIMEOUT,
          message: 'x',
        } as GeolocationPositionError),
      );
      await expect(layViTri()).rejects.toMatchObject({
        trangThai: TrangThai.LOI_VI_TRI,
      });
    }
  });

  it('trình duyệt không có geolocation (hoặc trang không phải secure context) → LOI_VI_TRI', async () => {
    vi.stubGlobal('navigator', {});
    await expect(layViTri()).rejects.toBeInstanceOf(LoiViTri);
    await expect(layViTri()).rejects.toMatchObject({
      trangThai: TrangThai.LOI_VI_TRI,
    });
  });

  it('lỗi ném ra luôn là LoiViTri (để nhánh bắt lỗi phân biệt được với lỗi API)', async () => {
    gaGeolocation((_ok, fail) =>
      fail?.({
        code: PERMISSION_DENIED,
        PERMISSION_DENIED,
        POSITION_UNAVAILABLE,
        TIMEOUT,
        message: 'x',
      } as GeolocationPositionError),
    );
    await expect(layViTri()).rejects.toBeInstanceOf(LoiViTri);
  });

  it('truyền timeout xuống getCurrentPosition, không dùng vị trí cache', async () => {
    const goi = vi.fn((ok: PositionCallback) =>
      ok({
        coords: { latitude: 1, longitude: 2, accuracy: 3 },
      } as GeolocationPosition),
    );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: goi } });

    await layViTri(4321);

    expect(goi.mock.calls[0][2]).toMatchObject({
      timeout: 4321,
      // maximumAge: 0 — chấm công phải lấy vị trí HIỆN TẠI. Dùng lại vị trí
      // cache sẽ ghi nhận nhân viên "ở văn phòng" bằng toạ độ của hôm qua.
      maximumAge: 0,
      enableHighAccuracy: true,
    });
  });
});
