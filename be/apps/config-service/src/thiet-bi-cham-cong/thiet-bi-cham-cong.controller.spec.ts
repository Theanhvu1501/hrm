import { RequestMethod } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { ThietBiChamCong_Controller } from './thiet-bi-cham-cong.controller';

/**
 * Đây là cơ chế chống chấm công hộ của cả hệ thống: mỗi nhân viên chỉ chấm
 * được từ đúng một thiết bị đã được HR duyệt. `deviceId` do client sinh nên
 * toàn bộ độ an toàn nằm ở luật "thiết bị lạ phải được HR duyệt" — nghĩa là
 * nằm ở hàng rào phân quyền của chính controller này. Nhân viên tự duyệt được
 * máy của mình là luật biến mất hoàn toàn.
 *
 * Hàng rào là `PermissionGuard` chứ KHÔNG phải `AdminGuard`: `AdminGuard` so
 * `vaiTro` với đúng chuỗi 'ADMIN'/'SUPER_ADMIN', trong khi `vaiTro` là tên vai
 * trò tự do từng tenant đặt ("Quản trị hệ thống", "Quản lý"...) nên trên
 * production nó chặn cả HR thật — không ai duyệt được thiết bị nào.
 */

const proto = ThietBiChamCong_Controller.prototype as any;

/**
 * Route quản trị: động từ HTTP và quyền BẮT BUỘC. duyet/tuChoi/thuHoi/
 * kichHoatLai là `@Post` nên nhận `:them` theo đúng bảng ánh xạ động-từ→quyền
 * dùng chung cho cả 7 controller — không tự chế quyền riêng cho module này.
 *
 * `kichHoatLai` dùng CHUNG `:them` với `duyet`: cả hai đều là "mở khoá một máy
 * chấm công", nên tách quyền riêng chỉ thêm một bước cấp quyền dễ quên lúc
 * deploy (màn hình 403) mà không chặn thêm rủi ro nào.
 */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cham-cong/thiet-bi:xem'],
  ['duyet', RequestMethod.POST, '/cham-cong/thiet-bi:them'],
  ['tuChoi', RequestMethod.POST, '/cham-cong/thiet-bi:them'],
  ['thuHoi', RequestMethod.POST, '/cham-cong/thiet-bi:them'],
  ['kichHoatLai', RequestMethod.POST, '/cham-cong/thiet-bi:them'],
];

/** Route tự phục vụ: cố ý KHÔNG nhận quyền theo vai trò. */
const ROUTE_TU_PHUC_VU = ['cuaToi'];

describe('ThietBiChamCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(ThietBiChamCong_Controller)).toContain(JwtGuard);
  });

  it.each(BANG_QUYEN)(
    'route %s có PermissionGuard và đòi đúng quyền',
    (ten, method, quyen) => {
      expect(httpMethodOf(proto[ten])).toBe(method);
      expect(guardsOf(proto[ten])).toContain(PermissionGuard);
      expect(permissionsOf(proto[ten])).toEqual([quyen]);
    },
  );

  /**
   * Mọi nhân viên (không riêng HR) đều phải xem được danh sách thiết bị của
   * CHÍNH MÌNH để biết máy đang chờ duyệt hay đã duyệt. Dữ liệu đã lọc theo
   * nhân viên đang đăng nhập nên không lộ thiết bị người khác. Xem chú thích
   * cuối `libs/core/src/permissions/all-permissions.ts`: `/cham-cong/cua-toi`
   * CỐ Ý không có trong catalog quyền.
   */
  it.each(ROUTE_TU_PHUC_VU)('route tự phục vụ %s KHÔNG gắn quyền', (ten) => {
    expect(permissionsOf(proto[ten])).toBeUndefined();
    expect(guardsOf(proto[ten])).not.toContain(PermissionGuard);
  });

  it('không route nào bị bỏ sót, kể cả route thêm sau này', () => {
    expect(quetPhanQuyenRoute(ThietBiChamCong_Controller)).toEqual([]);
  });

  it('bảng quyền + danh sách tự phục vụ phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(
      [...BANG_QUYEN.map(([t]) => t), ...ROUTE_TU_PHUC_VU].sort(),
    );
  });
});

describe('ThietBiChamCong_Controller — thứ tự route', () => {
  it('cua-toi khai TRƯỚC mọi route dùng ":id"', () => {
    const ten = Object.getOwnPropertyNames(proto);
    expect(Reflect.getMetadata(PATH_METADATA, proto.cuaToi)).toBe('cua-toi');
    for (const dungId of ['duyet', 'tuChoi', 'thuHoi', 'kichHoatLai']) {
      expect(ten.indexOf('cuaToi')).toBeLessThan(ten.indexOf(dungId));
    }
  });
});
