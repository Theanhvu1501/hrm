import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employeeDeviceService } from './employeeDeviceService';
import { ServiceBase } from './base/service-base';

/** Thay `super.post` bằng mock — phải spy trên prototype, không trên instance. */
function giaPost(ketQua: unknown) {
  return vi
    .spyOn(ServiceBase.prototype as any, 'post')
    .mockResolvedValue(ketQua);
}

describe('employeeDeviceService.kichHoatLai', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('POST đúng endpoint /:id/kich-hoat-lai', async () => {
    const post = giaPost({ _id: 'row-1', trangThai: 'da_duyet' });

    await employeeDeviceService.kichHoatLai('row-1');

    expect(post).toHaveBeenCalledWith(
      {},
      { endpoint: '/row-1/kich-hoat-lai' },
    );
  });

  /**
   * Chỉ kiểm tham số gọi API là chưa đủ: xoá `this.transform` đi test vẫn
   * xanh. Trả về `_id` dạng Mongo để buộc đi qua transform mới ra `id`.
   */
  it('map kết quả thô qua transform (_id -> id) và giữ lyDoThuHoi', async () => {
    giaPost({
      _id: 'row-1',
      employeeId: 'emp-1',
      deviceId: 'dev-A',
      trangThai: 'da_duyet',
      lyDoThuHoi: 'Nghi chấm hộ',
    });

    const kq = await employeeDeviceService.kichHoatLai('row-1');

    expect(kq).toEqual(
      expect.objectContaining({
        id: 'row-1',
        trangThai: 'da_duyet',
        // BE cố ý KHÔNG xoá lý do thu hồi khi mở lại — đó là dấu vết máy này
        // từng bị khoá. FE phải giữ được để hiện lên cột "Lý do khoá".
        lyDoThuHoi: 'Nghi chấm hộ',
      }),
    );
    expect(kq).not.toHaveProperty('_id');
  });
});
