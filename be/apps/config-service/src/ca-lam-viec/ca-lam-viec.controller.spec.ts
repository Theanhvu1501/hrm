import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { CaLamViec_Controller } from './ca-lam-viec.controller';

/**
 * Ca làm việc là mốc so sánh duy nhất để tính đi muộn/về sớm. Nhân viên sửa
 * được `gioBatDau` ca của mình thành 23:00 là không bao giờ muộn nữa — nên
 * mọi thao tác GHI phải qua quyền.
 *
 * Hàng rào là `PermissionGuard` chứ KHÔNG phải `AdminGuard`: `AdminGuard` so
 * `vaiTro` với đúng chuỗi 'ADMIN'/'SUPER_ADMIN', trong khi `vaiTro` là tên vai
 * trò tự do từng tenant đặt ("Quản trị hệ thống", "Quản lý"...) nên trên
 * production nó chặn cả HR thật.
 *
 * `GET /ca-lam-viec` còn được FE gọi ở tab "Chấm công" trong hồ sơ nhân viên
 * (fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/tabs/ChamCongTab.tsx),
 * nên vai trò mở được hồ sơ nhân viên cũng phải có `/cham-cong/ca-lam-viec:xem`.
 */

const proto = CaLamViec_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cham-cong/ca-lam-viec:xem'],
  ['findOne', RequestMethod.GET, '/cham-cong/ca-lam-viec:xem'],
  ['create', RequestMethod.POST, '/cham-cong/ca-lam-viec:them'],
  ['update', RequestMethod.PUT, '/cham-cong/ca-lam-viec:sua'],
  ['remove', RequestMethod.DELETE, '/cham-cong/ca-lam-viec:xoa'],
];

describe('CaLamViec_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(CaLamViec_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(CaLamViec_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });
});
