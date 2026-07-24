import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard, RoleGuard, ROLES_KEY } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { NguoiDung_Controller } from './nguoi-dung.controller';

/**
 * Controller này là ví dụ nguy hiểm nhất trong nhóm: nó TRÔNG như đã được bảo
 * vệ. Trước bản vá nó khai `@UseGuards(JwtGuard, RoleGuard)` và `@Roles('ADMIN')`
 * trên từng route, nhưng `libs/auth/src/guards/role.guard.ts` `canActivate()`
 * chỉ `return true`, nên mọi tài khoản đăng nhập đều thêm/xoá/khoá được tài
 * khoản của cả tenant — và đổi được vai trò, tức đổi được bộ quyền.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy.
 */

const proto = NguoiDung_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cau-hinh/thanh-vien:xem'],
  ['getStats', RequestMethod.GET, '/cau-hinh/thanh-vien:xem'],
  ['getAvailableUsers', RequestMethod.GET, '/cau-hinh/thanh-vien:xem'],
  ['addExistingUser', RequestMethod.POST, '/cau-hinh/thanh-vien:them'],
  ['findOne', RequestMethod.GET, '/cau-hinh/thanh-vien:xem'],
  ['create', RequestMethod.POST, '/cau-hinh/thanh-vien:them'],
  ['update', RequestMethod.PUT, '/cau-hinh/thanh-vien:sua'],
  ['delete', RequestMethod.DELETE, '/cau-hinh/thanh-vien:xoa'],
  // Khoá/mở tài khoản là SỬA thành viên đã có, không phải xoá.
  ['toggleStatus', RequestMethod.PATCH, '/cau-hinh/thanh-vien:sua'],
];

describe('NguoiDung_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(NguoiDung_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(NguoiDung_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(NguoiDung_Controller, [])).toEqual([]);
  });
});

/**
 * `RoleGuard`/`@Roles` phải BIẾN MẤT chứ không chỉ "có thêm PermissionGuard
 * bên cạnh". Một hàng rào no-op nằm cạnh hàng rào thật là mồi cho lần rà soát
 * sau: người đọc thấy `@Roles('ADMIN')` sẽ tưởng route đã giới hạn theo vai
 * trò và bỏ qua. Khoá lại để nó không lặng lẽ quay về.
 */
describe('NguoiDung_Controller — không còn hàng rào giả', () => {
  it('class KHÔNG còn RoleGuard', () => {
    expect(guardsOf(NguoiDung_Controller)).not.toContain(RoleGuard);
  });

  it.each(BANG_QUYEN)('route %s KHÔNG còn RoleGuard lẫn @Roles', (ten) => {
    expect(guardsOf(proto[ten])).not.toContain(RoleGuard);
    expect(Reflect.getMetadata(ROLES_KEY, proto[ten])).toBeUndefined();
  });
});
