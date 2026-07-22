import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminGuard, JwtGuard } from '@app/auth';
import { NgayLe_Controller } from './ngay-le.controller';

/**
 * Ngày lễ là dữ liệu quyết định tiền công của CẢ công ty, không phải cấu
 * hình vô hại: `BanGhiChamCong_Service.suyNgayNghi()` hỏi đúng bảng này, và
 * hễ trả `true` thì `tinhMuonSom()` trả `{0, 0}` cho mọi nhân viên trong
 * ngày đó. Nhân viên tự tạo được một ngày lễ giả là xoá sạch đi muộn của
 * toàn công ty hôm đó.
 *
 * Tệ hơn: `laNgayNghi` được ghi thành SNAPSHOT trên từng bản ghi chấm công.
 * HR xoá ngày lễ giả đi thì các bản ghi đã tạo vẫn mang `laNgayNghi: true`
 * vĩnh viễn — không có đường sửa từ giao diện. Nên hàng rào phải chặn ngay
 * ở lúc ghi, không thể sửa bù sau.
 *
 * Dùng `AdminGuard` (kiểm `vaiTro`), KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true` nên mọi `@Roles` đều vô hiệu.
 *
 * Test này bám vào metadata `__guards__` vì đó chính là thứ Nest đọc lúc
 * chạy — gỡ `@UseGuards(AdminGuard)` khỏi bất kỳ route ghi nào là đỏ ngay.
 */

const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

const httpMethodOf = (fn: any): RequestMethod =>
  Reflect.getMetadata(METHOD_METADATA, fn);

const proto = NgayLe_Controller.prototype as any;

/** Mọi route ghi của controller, kèm động từ HTTP mong đợi. */
const ROUTE_GHI: Array<[string, RequestMethod]> = [
  ['create', RequestMethod.POST],
  ['update', RequestMethod.PUT],
  ['remove', RequestMethod.DELETE],
];

/** Route đọc: CỐ Ý chỉ JwtGuard — xem describe bên dưới. */
const ROUTE_DOC = ['findAll', 'findOne'];

describe('NgayLe_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(NgayLe_Controller)).toContain(JwtGuard);
  });

  it.each(ROUTE_GHI)('route ghi %s phải có AdminGuard', (ten) => {
    expect(guardsOf(proto[ten])).toContain(AdminGuard);
  });

  it.each(ROUTE_GHI)(
    'route %s vẫn đúng động từ HTTP (không bị đổi tên/đổi verb làm test mất mục tiêu)',
    (ten, method) => {
      expect(httpMethodOf(proto[ten])).toBe(method);
    },
  );

  /**
   * Đọc danh sách ngày lễ KHÔNG khoá theo quản trị: đây là dữ liệu lịch
   * chung, và bọc GET sẽ làm vỡ các màn hình nhân viên thường đang gọi bằng
   * token thường. Chỉ thao tác GHI mới cần quản trị.
   */
  it.each(ROUTE_DOC)('route đọc %s KHÔNG gắn AdminGuard', (ten) => {
    expect(guardsOf(proto[ten])).not.toContain(AdminGuard);
  });

  it('không route ghi nào bị bỏ sót: mọi @Post/@Put/@Delete đều có AdminGuard', () => {
    const VERB_GHI = [
      RequestMethod.POST,
      RequestMethod.PUT,
      RequestMethod.PATCH,
      RequestMethod.DELETE,
    ];

    const routeGhiThucTe = Object.getOwnPropertyNames(proto).filter((ten) =>
      VERB_GHI.includes(httpMethodOf(proto[ten])),
    );

    // Nếu ai đó thêm một route ghi mới mà quên AdminGuard, danh sách này sẽ
    // không rỗng và test đỏ — không cần nhớ cập nhật ROUTE_GHI bằng tay.
    const thieuGuard = routeGhiThucTe.filter(
      (ten) => !guardsOf(proto[ten]).includes(AdminGuard),
    );
    expect(thieuGuard).toEqual([]);
    expect(routeGhiThucTe.sort()).toEqual(ROUTE_GHI.map(([t]) => t).sort());
  });
});
