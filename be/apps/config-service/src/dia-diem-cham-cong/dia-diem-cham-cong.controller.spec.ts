import { RequestMethod } from '@nestjs/common';
import { JwtGuard, PermissionGuard } from '@app/auth';
import {
  guardsOf,
  httpMethodOf,
  permissionsOf,
  quetPhanQuyenRoute,
} from '../testing/quet-phan-quyen-route';
import { DiaDiemChamCong_Controller } from './dia-diem-cham-cong.controller';

/**
 * `doiChieuGps` chọn địa điểm GẦN NHẤT rồi so với `banKinh` của chính địa
 * điểm đó. Nhân viên tự tạo được một địa điểm gps ngay tại nhà mình với
 * `banKinh: 5000` thì địa điểm gần nhất luôn là nhà họ → `ngoaiVung: false`
 * mọi lúc, và toàn bộ tín hiệu đối chiếu vị trí mà HR dựa vào mất sạch —
 * không chỉ với người tạo mà với mọi ai đứng trong bán kính đó.
 *
 * Hàng rào là `PermissionGuard` chứ KHÔNG phải `AdminGuard`: `AdminGuard` so
 * `vaiTro` với đúng chuỗi 'ADMIN'/'SUPER_ADMIN', trong khi `vaiTro` là tên vai
 * trò tự do từng tenant đặt nên trên production nó chặn cả HR thật.
 */

const proto = DiaDiemChamCong_Controller.prototype as any;

/** Toàn bộ route của controller kèm động từ HTTP và quyền BẮT BUỘC. */
const BANG_QUYEN: Array<[string, RequestMethod, string]> = [
  ['findAll', RequestMethod.GET, '/cham-cong/dia-diem:xem'],
  ['findOne', RequestMethod.GET, '/cham-cong/dia-diem:xem'],
  ['create', RequestMethod.POST, '/cham-cong/dia-diem:them'],
  ['update', RequestMethod.PUT, '/cham-cong/dia-diem:sua'],
  ['remove', RequestMethod.DELETE, '/cham-cong/dia-diem:xoa'],
];

describe('DiaDiemChamCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(DiaDiemChamCong_Controller)).toContain(JwtGuard);
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
    expect(quetPhanQuyenRoute(DiaDiemChamCong_Controller)).toEqual([]);
  });

  it('bảng quyền ở trên phủ đúng toàn bộ route của controller', () => {
    const routeThucTe = Object.getOwnPropertyNames(proto).filter(
      (ten) => httpMethodOf(proto[ten]) !== undefined,
    );
    expect(routeThucTe.sort()).toEqual(BANG_QUYEN.map(([t]) => t).sort());
  });
});
