import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { ThoiViec_Controller } from './thoi-viec.controller';

/**
 * Hồ sơ thôi việc quyết định ngày nghỉ việc và tình trạng bàn giao. Trước bản
 * vá, controller chỉ có `JwtGuard` — mọi tài khoản đăng nhập tạo được hồ sơ
 * thôi việc đứng tên đồng nghiệp bất kỳ.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy.
 */

const proto = ThoiViec_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/nhan-su/thoi-viec:xem'],
  ['findOne', RequestMethod.GET, '/nhan-su/thoi-viec:xem'],
  ['create', RequestMethod.POST, '/nhan-su/thoi-viec:them'],
  ['update', RequestMethod.PUT, '/nhan-su/thoi-viec:sua'],
  ['remove', RequestMethod.DELETE, '/nhan-su/thoi-viec:xoa'],
  // Duyệt/hoàn tất bàn giao là SỬA hồ sơ đã có, không phải xoá.
  ['updateStatus', RequestMethod.PATCH, '/nhan-su/thoi-viec:sua'],
];

describe('ThoiViec_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(ThoiViec_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(ThoiViec_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(ThoiViec_Controller, [])).toEqual([]);
  });
});
