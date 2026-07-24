import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { QuaTrinhCongTac_Controller } from './qua-trinh-cong-tac.controller';

/**
 * Quá trình công tác là lịch sử chức danh/phòng ban/mức lương theo thời gian.
 * Trước bản vá, controller chỉ có `JwtGuard` — mọi tài khoản đăng nhập đọc và
 * sửa được lịch sử lương của cả công ty.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy.
 */

const proto = QuaTrinhCongTac_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/nhan-su/qua-trinh-cong-tac:xem'],
  ['findOne', RequestMethod.GET, '/nhan-su/qua-trinh-cong-tac:xem'],
  ['create', RequestMethod.POST, '/nhan-su/qua-trinh-cong-tac:them'],
  ['update', RequestMethod.PUT, '/nhan-su/qua-trinh-cong-tac:sua'],
  ['remove', RequestMethod.DELETE, '/nhan-su/qua-trinh-cong-tac:xoa'],
];

describe('QuaTrinhCongTac_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(QuaTrinhCongTac_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(QuaTrinhCongTac_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(QuaTrinhCongTac_Controller, [])).toEqual([]);
  });
});
