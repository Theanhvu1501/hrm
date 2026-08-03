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
/**
 * Route TỰ PHỤC VỤ (P4.3): nhân viên xem phiếu lương của CHÍNH mình. Cố ý
 * không có `@Permissions` — bắt HR gán quyền cho từng người thì người mới
 * không xem được lương tháng đầu. Phạm vi khoá bằng `employeeId` suy từ token
 * trong controller, chặt hơn quyền.
 */
const ROUTE_TU_PHUC_VU = ['kyCoPhieuLuongCuaToi', 'phieuLuongCuaToi'];

const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['layCauHinh', RequestMethod.GET, '/luong/cau-hinh:xem'],
  // Dùng lại quyền của màn Cấu hình lương thay vì mở module quyền mới — thêm
  // module là thêm một bước `ops/grant-quyen-module-moi.ts` bắt buộc lúc
  // deploy, không đáng cho một endpoint đếm (P4.2b §6).
  ['demDonTheoLoaiOt', RequestMethod.GET, '/luong/cau-hinh:xem'],
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

  it('route tự phục vụ KHÔNG khai @Permissions', () => {
    for (const ten of ROUTE_TU_PHUC_VU) {
      expect(permissionsOf(proto[ten])).toBeUndefined();
    }
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route KHÔNG tự phục vụ', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) =>
        httpMethodOf(proto[ten]) !== undefined &&
        !ROUTE_TU_PHUC_VU.includes(ten),
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

});
