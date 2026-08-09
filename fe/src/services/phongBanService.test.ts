import { describe, it, expect, vi, beforeEach } from 'vitest';
import { phongBanService } from './phongBanService';
import { ServiceBase } from './base/service-base';

/**
 * ServiceBase.get() đã tự bóc { success, data } ở parseResponse() (xem
 * service-base.ts) — mock trả thẳng mảng, không phải { data: [...] }.
 * Theo đúng khuôn của attendanceRecordService.test.ts: spy trên
 * ServiceBase.prototype (không mock cả module) vì phongBanService là một
 * singleton đã khởi tạo tại import-time.
 */
function gia(ketQua: unknown) {
  return vi.spyOn(ServiceBase.prototype as any, 'get').mockResolvedValue(ketQua);
}

describe('phongBanService.list', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('gọi đúng endpoint /config/phong-ban và trả mảng phòng ban', async () => {
    const rows = [
      { id: 'd1', maPhong: 'KT', tenPhong: 'Kế toán', parentId: null, path: [], thuTu: 0 },
    ];
    const get = gia(rows);

    const result = await phongBanService.list();

    expect(get).toHaveBeenCalledWith({});
    expect(result).toEqual(rows);
  });

  it('trả mảng rỗng khi backend trả undefined thay vì mảng', async () => {
    gia(undefined);

    await expect(phongBanService.list()).resolves.toEqual([]);
  });
});
