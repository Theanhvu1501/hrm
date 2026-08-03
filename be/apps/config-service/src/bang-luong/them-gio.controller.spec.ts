import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { ThemGio_Controller } from './them-gio.controller';

/**
 * Bảng thanh toán tiền làm thêm giờ ghi thu nhập thật của nhân viên và là
 * biểu mẫu pháp định đem đi ký — cùng nhóm rủi ro với bảng lương chính. Test
 * bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest đọc
 * lúc chạy: gỡ `@Permissions` hay `@UseGuards(PermissionGuard)` khỏi bất kỳ
 * route nào là đỏ ngay.
 */

const proto = ThemGio_Controller.prototype as any;

/**
 * Toàn bộ route kèm động từ HTTP và quyền BẮT BUỘC.
 *
 * Dùng lại `/luong/bang-luong:*` thay vì mở module quyền mới — thêm module là
 * thêm một bước bắt buộc `ops/grant-quyen-module-moi.ts` lúc deploy.
 */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['danhSach', RequestMethod.GET, '/luong/bang-luong:xem'],
  ['tongHop', RequestMethod.POST, '/luong/bang-luong:them'],
  ['chot', RequestMethod.POST, '/luong/bang-luong:sua'],
  ['moLai', RequestMethod.POST, '/luong/bang-luong:sua'],
  ['capNhatDong', RequestMethod.PATCH, '/luong/bang-luong:sua'],
];

describe('ThemGio_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(ThemGio_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(ThemGio_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  /**
   * Không có route tự phục vụ ở màn này (nhân viên không tự xem bảng thanh
   * toán tiền làm thêm của cả công ty). Khoá lại tường minh: nếu sau này cần,
   * cách đúng là khoá phạm vi bằng `employeeId` suy từ token, không phải gỡ
   * quyền của các route hiện có.
   */
  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(ThemGio_Controller, [])).toEqual([]);
  });
});
