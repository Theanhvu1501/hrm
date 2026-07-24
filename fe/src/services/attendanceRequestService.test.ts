import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attendanceRequestService } from './attendanceRequestService';
import { ServiceBase } from './base/service-base';

/**
 * Thay `super.get` bằng mock. `get()` không bị AttendanceRequestService
 * override nên `this.get` và `super.get` cùng trỏ về một hàm trên
 * ServiceBase.prototype — spy PHẢI đặt trên prototype đó (không phải trên
 * instance `attendanceRequestService`), nếu không mock không ăn và test sẽ
 * gọi HTTP thật ra ngoài. Cùng bẫy đã ghi ở attendanceRecordService.test.ts.
 */
function gia(ketQua: unknown) {
  return vi.spyOn(ServiceBase.prototype as any, 'get').mockResolvedValue(ketQua);
}
function giaPost(ketQua: unknown) {
  return vi.spyOn(ServiceBase.prototype as any, 'post').mockResolvedValue(ketQua);
}
function giaDelete(ketQua: unknown = undefined) {
  return vi.spyOn(ServiceBase.prototype as any, 'delete').mockResolvedValue(ketQua);
}

describe('attendanceRequestService.cuaToi', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('gọi đúng route tự phục vụ GET /cua-toi, không phải route quản trị', async () => {
    const get = gia([]);

    await attendanceRequestService.cuaToi();

    // Route quản trị (GET /don-cham-cong, không có endpoint con) đòi quyền
    // /cham-cong/don-tu:xem mà nhân viên thường không có — nếu code lỡ gọi
    // getList() thay vì cuaToi(), test này phải bắt được bằng cách kiểm tra
    // đúng endpoint '/cua-toi' được truyền xuống ServiceBase.
    expect(get).toHaveBeenCalledWith({ endpoint: '/cua-toi' });
  });

  /**
   * Chỉ kiểm tham số gọi API là chưa đủ: nếu ai đó lỡ xoá `.map(this.transform)`
   * thì test trên vẫn xanh. Đưa bản ghi thô có `_id` (dạng Mongo) để bắt buộc
   * phải qua transform() mới ra được `id`.
   */
  it('map danh sách thô qua transform (vd. _id -> id)', async () => {
    gia([
      {
        _id: 'don1',
        employeeId: 'e1',
        loaiDon: 'nghi_phep',
        ngay: '2026-07-24',
        trangThai: 'cho_duyet',
      },
    ]);

    const kq = await attendanceRequestService.cuaToi();

    expect(kq).toEqual([
      expect.objectContaining({
        id: 'don1',
        employeeId: 'e1',
        loaiDon: 'nghi_phep',
        ngay: '2026-07-24',
        trangThai: 'cho_duyet',
      }),
    ]);
    expect(kq[0]).not.toHaveProperty('_id');
  });

  /**
   * Bẫy soGioOt/soNgayNghi = 0 là giá trị THẬT (vd. đơn OT không có giờ hợp
   * lệ, hoặc khoảng nghỉ trùng hết vào ngày lễ/cuối tuần) — nếu transform()
   * lỡ dùng `x.soGioOt || ...` thay vì cast thuần/`??`, 0 sẽ biến mất.
   */
  it('giữ nguyên soGioOt=0 và soNgayNghi=0 của backend, không nuốt mất', async () => {
    gia([
      {
        _id: 'don2',
        employeeId: 'e1',
        loaiDon: 'lam_them_gio',
        ngay: '2026-07-24',
        trangThai: 'cho_duyet',
        soGioOt: 0,
        soNgayNghi: 0,
      },
    ]);

    const kq = await attendanceRequestService.cuaToi();

    expect(kq[0].soGioOt).toBe(0);
    expect(kq[0].soNgayNghi).toBe(0);
  });

  /** isActive=false là giá trị thật (đơn đã bị xoá mềm) — không được lùi về true. */
  it('giữ nguyên isActive=false của backend', async () => {
    gia([
      {
        _id: 'don3',
        employeeId: 'e1',
        loaiDon: 'giai_trinh',
        ngay: '2026-07-24',
        trangThai: 'cho_duyet',
        isActive: false,
      },
    ]);

    const kq = await attendanceRequestService.cuaToi();

    expect(kq[0].isActive).toBe(false);
  });

  /** Các trường nghỉ phép mới phải đi qua transform, không bị bỏ sót. */
  it('đọc được denNgay/buoi/loaiNghi/heSoOt/loaiNgayOt', async () => {
    gia([
      {
        _id: 'don4',
        employeeId: 'e1',
        loaiDon: 'nghi_phep',
        ngay: '2026-07-24',
        denNgay: '2026-07-28',
        buoi: 'sang',
        loaiNghi: 'phep_nam',
        trangThai: 'cho_duyet',
      },
      {
        _id: 'don5',
        employeeId: 'e1',
        loaiDon: 'lam_them_gio',
        ngay: '2026-07-24',
        trangThai: 'cho_duyet',
        heSoOt: 1.5,
        loaiNgayOt: 'ngay_thuong',
      },
    ]);

    const kq = await attendanceRequestService.cuaToi();

    expect(kq[0]).toEqual(
      expect.objectContaining({
        denNgay: '2026-07-28',
        buoi: 'sang',
        loaiNghi: 'phep_nam',
      }),
    );
    expect(kq[1]).toEqual(
      expect.objectContaining({ heSoOt: 1.5, loaiNgayOt: 'ngay_thuong' }),
    );
  });
});

describe('attendanceRequestService.taoDonCuaToi', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('POST đúng route tự phục vụ /cua-toi kèm nguyên dto, không tự thêm employeeId', async () => {
    const post = giaPost({
      _id: 'don-moi',
      employeeId: 'e1',
      loaiDon: 'giai_trinh',
      ngay: '2026-07-24',
      trangThai: 'cho_duyet',
    });

    const dto = {
      loaiDon: 'giai_trinh' as const,
      ngay: '2026-07-24',
      lyDo: 'Quên chấm công',
    };

    await attendanceRequestService.taoDonCuaToi(dto);

    // Route quản trị POST /don-cham-cong (không có endpoint con) đòi quyền
    // /cham-cong/don-tu:them — nhầm route là nhân viên thường ăn 403.
    // Đối chiếu cả body: backend forbidNonWhitelisted sẽ 400 nếu lỡ có thêm
    // trường lạ (vd. employeeId) không khai trong TaoDonCuaToiDto.
    expect(post).toHaveBeenCalledWith(dto, { endpoint: '/cua-toi' });
  });

  it('trả về đơn đã transform từ response backend', async () => {
    giaPost({
      _id: 'don-moi',
      employeeId: 'e1',
      loaiDon: 'nghi_phep',
      ngay: '2026-07-24',
      denNgay: '2026-07-24',
      buoi: 'ca_ngay',
      loaiNghi: 'om_dau',
      trangThai: 'cho_duyet',
      soNgayNghi: 1,
    });

    const kq = await attendanceRequestService.taoDonCuaToi({
      loaiDon: 'nghi_phep',
      ngay: '2026-07-24',
      denNgay: '2026-07-24',
      buoi: 'ca_ngay',
      loaiNghi: 'om_dau',
    });

    expect(kq).toEqual(
      expect.objectContaining({
        id: 'don-moi',
        loaiNghi: 'om_dau',
        soNgayNghi: 1,
      }),
    );
  });
});

describe('attendanceRequestService.huyDonCuaToi', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('DELETE đúng route tự phục vụ /cua-toi/:id', async () => {
    const del = giaDelete();

    await attendanceRequestService.huyDonCuaToi('don1');

    // Route quản trị DELETE /don-cham-cong/:id đòi quyền /cham-cong/don-tu:xoa
    // — nhân viên thường sẽ ăn 403 nếu code gọi nhầm remove() thay vì
    // huyDonCuaToi(). Endpoint phải có tiền tố 'cua-toi/'.
    expect(del).toHaveBeenCalledWith({ endpoint: '/cua-toi/don1' });
  });
});
