import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { BangCong_Controller } from './bang-cong.controller';

/**
 * Bảng công là bảng tính lương — đọc được nó là biết số công/số giờ OT của
 * cả công ty, ghi được nó là đổi được số tiền người khác nhận. Trước bản vá,
 * controller chỉ có `JwtGuard`.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy — gỡ `@Permissions` hay `@UseGuards(PermissionGuard)` khỏi bất
 * kỳ route nào là đỏ ngay.
 */

const proto = BangCong_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['kyHieu', RequestMethod.GET, '/cham-cong/bang-cong:xem'],
  ['findAll', RequestMethod.GET, '/cham-cong/bang-cong:xem'],
  ['findOne', RequestMethod.GET, '/cham-cong/bang-cong:xem'],
  ['generate', RequestMethod.POST, '/cham-cong/bang-cong:them'],
  ['update', RequestMethod.PUT, '/cham-cong/bang-cong:sua'],
  ['setDay', RequestMethod.PATCH, '/cham-cong/bang-cong:sua'],
  ['finalize', RequestMethod.POST, '/cham-cong/bang-cong:them'],
  ['remove', RequestMethod.DELETE, '/cham-cong/bang-cong:xoa'],
];

describe('BangCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(BangCong_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(BangCong_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  /**
   * Màn hình `/toi/bang-cong` của nhân viên hiện là `ComingSoonPage` và không
   * gọi API nào, nên module này KHÔNG có route tự phục vụ. Khoá lại tường
   * minh: khi ai đó làm màn hình đó thật, cách đúng là thêm route `cua-toi`
   * khoá phạm vi bằng `employeeId` suy từ token, không phải gỡ quyền của các
   * route hiện có.
   */
  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(BangCong_Controller, [])).toEqual([]);
  });
});
