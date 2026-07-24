import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
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
 * Hàng rào là `PermissionGuard` chứ KHÔNG phải `AdminGuard`: `AdminGuard` so
 * `vaiTro` với đúng chuỗi 'ADMIN'/'SUPER_ADMIN', trong khi `vaiTro` là tên vai
 * trò tự do từng tenant đặt ("Quản trị hệ thống", "Quản lý"...) nên trên
 * production nó chặn cả HR thật. Cũng KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true`.
 *
 * Test bám vào metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ
 * Nest đọc lúc chạy — gỡ `@Permissions` hoặc `@UseGuards(PermissionGuard)`
 * khỏi bất kỳ route nào là đỏ ngay.
 */

const proto = NgayLe_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cham-cong/ngay-le:xem'],
  ['findOne', RequestMethod.GET, '/cham-cong/ngay-le:xem'],
  ['create', RequestMethod.POST, '/cham-cong/ngay-le:them'],
  ['update', RequestMethod.PUT, '/cham-cong/ngay-le:sua'],
  ['remove', RequestMethod.DELETE, '/cham-cong/ngay-le:xoa'],
];

describe('NgayLe_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(NgayLe_Controller)).toContain(JwtGuard);
  });

  it.each(BANG_QUYEN)(
    'route %s có PermissionGuard và đòi đúng quyền',
    (ten, method, quyen) => {
      expect(httpMethodOf(proto[ten])).toBe(method);
      expect(guardsOf(proto[ten])).toContain(PermissionGuard);
      expect(permissionsOf(proto[ten])).toEqual([quyen]);
    },
  );

  it('không route nào bị bỏ sót, kể cả route thêm sau này', () => {
    expect(quetPhanQuyenRoute(NgayLe_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });
});
