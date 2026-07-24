import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { BangLuong_Controller } from './bang-luong.controller';

/**
 * Bảng lương đọc/ghi thu nhập thật của toàn bộ nhân viên — nhạy cảm hơn cả
 * bảng công. Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính
 * là thứ Nest đọc lúc chạy — gỡ `@Permissions` hay `@UseGuards(PermissionGuard)`
 * khỏi bất kỳ route nào là đỏ ngay.
 */

const proto = BangLuong_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['layCauHinh', RequestMethod.GET, '/luong/bang-luong:xem'],
  ['capNhatCauHinh', RequestMethod.PUT, '/luong/cau-hinh:sua'],
  ['tongHop', RequestMethod.POST, '/luong/bang-luong:them'],
  ['chot', RequestMethod.POST, '/luong/bang-luong:sua'],
  ['moLai', RequestMethod.POST, '/luong/bang-luong:sua'],
  ['danhSachDong', RequestMethod.GET, '/luong/bang-luong:xem'],
  ['capNhatDong', RequestMethod.PATCH, '/luong/bang-luong:sua'],
];

describe('BangLuong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(BangLuong_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(BangLuong_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  /**
   * Module này không có route tự phục vụ (không màn hình "lương của tôi" ở
   * phase này) — khoá lại tường minh: nếu ai đó thêm route như vậy sau này,
   * cách đúng là khoá phạm vi bằng `employeeId` suy từ token, không phải gỡ
   * quyền của các route hiện có.
   */
  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(BangLuong_Controller, [])).toEqual([]);
  });
});
