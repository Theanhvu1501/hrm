import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { HopDong_Controller } from './hop-dong.controller';

/**
 * Hợp đồng lao động chứa lương và thời hạn của từng người. Trước bản vá,
 * controller chỉ có `JwtGuard` — mọi tài khoản đăng nhập đọc được lương toàn
 * công ty. Đây là dữ liệu không "sửa bù" được sau khi đã lộ.
 *
 * Test bám metadata `__guards__` / `PERMISSIONS_KEY` vì đó chính là thứ Nest
 * đọc lúc chạy.
 */

const proto = HopDong_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/nhan-su/hop-dong-lao-dong:xem'],
  ['findOne', RequestMethod.GET, '/nhan-su/hop-dong-lao-dong:xem'],
  ['create', RequestMethod.POST, '/nhan-su/hop-dong-lao-dong:them'],
  ['update', RequestMethod.PUT, '/nhan-su/hop-dong-lao-dong:sua'],
  ['remove', RequestMethod.DELETE, '/nhan-su/hop-dong-lao-dong:xoa'],
  // Đổi trạng thái hợp đồng (hiệu lực/hết hạn/thanh lý) là SỬA hợp đồng đã
  // có, không phải xoá.
  ['updateStatus', RequestMethod.PATCH, '/nhan-su/hop-dong-lao-dong:sua'],
  // Mẫu in HĐLĐ (xem P nhân sự — in HĐLĐ): xem = đọc mẫu, sửa = lưu/khôi phục.
  ['getMauIn', RequestMethod.GET, '/nhan-su/hop-dong-lao-dong:xem'],
  ['upsertMauIn', RequestMethod.PUT, '/nhan-su/hop-dong-lao-dong:sua'],
  ['removeMauIn', RequestMethod.DELETE, '/nhan-su/hop-dong-lao-dong:sua'],
  ['getThongTinCongTy', RequestMethod.GET, '/nhan-su/hop-dong-lao-dong:xem'],
  ['upsertThongTinCongTy', RequestMethod.PUT, '/nhan-su/hop-dong-lao-dong:sua'],
  // In hợp đồng (render) = hành động xuất tài liệu → quyền "xuat", giống
  // canExport ở FE (usePagePermission).
  ['renderHopDong', RequestMethod.GET, '/nhan-su/hop-dong-lao-dong:xuat'],
];

describe('HopDong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(HopDong_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(HopDong_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });

  it('không route nào được miễn trừ theo diện tự phục vụ', () => {
    expect(quetPhanQuyenRoute(HopDong_Controller, [])).toEqual([]);
  });
});
