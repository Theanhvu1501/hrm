import { RequestMethod } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { NhanVien_Controller } from './nhan-vien.controller';

/**
 * Hồ sơ nhân viên là nơi neo mọi thứ của chấm công: `userId` (đường nối tài
 * khoản ↔ hồ sơ) và `workShiftId` (mốc tính muộn/sớm). Để hở thao tác ghi
 * thì nhân viên tự xoá `workShiftId` của mình là không bao giờ bị tính muộn,
 * còn xoá `userId` của đồng nghiệp là người đó mất hẳn đường chấm công.
 *
 * Hàng rào là `PermissionGuard` chứ KHÔNG phải `AdminGuard`: `AdminGuard` so
 * `vaiTro` với đúng chuỗi 'ADMIN'/'SUPER_ADMIN', trong khi `vaiTro` là tên vai
 * trò tự do từng tenant đặt ("Quản trị hệ thống", "Quản lý"...) nên trên
 * production nó chặn cả HR thật — không ai tạo/sửa/xoá được nhân viên.
 *
 * `GET /nhan-vien` được FE gọi ở màn Bản ghi chấm công và 6 màn hình khác để
 * đổ ô chọn nhân viên, nên vai trò mở được các màn đó cũng cần
 * `/nhan-su/ho-so-nhan-vien:xem`.
 */

const proto = NhanVien_Controller.prototype as any;

/** Route quản trị: động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/nhan-su/ho-so-nhan-vien:xem'],
  ['findOne', RequestMethod.GET, '/nhan-su/ho-so-nhan-vien:xem'],
  ['create', RequestMethod.POST, '/nhan-su/ho-so-nhan-vien:them'],
  ['update', RequestMethod.PUT, '/nhan-su/ho-so-nhan-vien:sua'],
  ['remove', RequestMethod.DELETE, '/nhan-su/ho-so-nhan-vien:xoa'],
  // @Patch đổi trạng thái xếp cùng nhóm @Delete → `:xoa` (ngưng hoạt động là
  // xoá mềm, không phải sửa thông tin).
  ['updateStatus', RequestMethod.PATCH, '/nhan-su/ho-so-nhan-vien:xoa'],
];

/** Route tự phục vụ: cố ý KHÔNG nhận quyền theo vai trò. */
const ROUTE_TU_PHUC_VU = ['me'];

describe('NhanVien_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(NhanVien_Controller)).toContain(JwtGuard);
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
   * `GET /nhan-vien/me` là hồ sơ của CHÍNH người đang đăng nhập — mọi nhân
   * viên phải xem được, kể cả người mới chưa được HR gán vai trò nào. Gắn
   * quyền vào đây là khoá luôn màn hình cá nhân của họ.
   */
  it.each(ROUTE_TU_PHUC_VU)(
    'route tự phục vụ %s KHÔNG gắn quyền',
    (ten) => {
      expect(permissionsOf(proto[ten])).toBeUndefined();
      expect(guardsOf(proto[ten])).not.toContain(PermissionGuard);
    },
  );

  it('không route nào bị bỏ sót, kể cả route thêm sau này', () => {
    expect(quetPhanQuyenRoute(NhanVien_Controller)).toEqual([]);
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

describe('NhanVien_Controller — thứ tự route', () => {
  it('me khai báo TRƯỚC @Get(":id") để không bị khớp thành tham số', () => {
    const ten = Object.getOwnPropertyNames(proto);
    expect(ten.indexOf('me')).toBeGreaterThan(-1);
    expect(ten.indexOf('me')).toBeLessThan(ten.indexOf('findOne'));
    expect(Reflect.getMetadata(PATH_METADATA, proto.me)).toBe('me');
    expect(Reflect.getMetadata(PATH_METADATA, proto.findOne)).toBe(':id');
  });
});
