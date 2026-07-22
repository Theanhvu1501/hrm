import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminGuard, JwtGuard } from '@app/auth';
import { DiaDiemChamCong_Controller } from './dia-diem-cham-cong.controller';

/**
 * `doiChieuGps` chọn địa điểm GẦN NHẤT rồi so với `banKinh` của chính địa
 * điểm đó. Nhân viên tự tạo được một địa điểm gps ngay tại nhà mình với
 * `banKinh: 5000` thì địa điểm gần nhất luôn là nhà họ → `ngoaiVung: false`
 * mọi lúc, và toàn bộ tín hiệu đối chiếu vị trí mà HR dựa vào mất sạch —
 * không chỉ với người tạo mà với mọi ai đứng trong bán kính đó.
 *
 * Nên mọi thao tác GHI là quản trị. `@Get` giữ JwtGuard để màn hình quản lý
 * địa điểm (và các màn dùng chung sau này) không phải phụ thuộc vaiTro.
 */

const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

const httpMethodOf = (fn: any): RequestMethod =>
  Reflect.getMetadata(METHOD_METADATA, fn);

const proto = DiaDiemChamCong_Controller.prototype as any;

const VERB_GHI = [
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
];

describe('DiaDiemChamCong_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(DiaDiemChamCong_Controller)).toContain(JwtGuard);
  });

  it.each([['create'], ['update'], ['remove']])(
    'route ghi %s phải có AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).toContain(AdminGuard);
    },
  );

  it.each([['findAll'], ['findOne']])(
    'route đọc %s KHÔNG gắn AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).not.toContain(AdminGuard);
    },
  );

  it('mọi route ghi đều có AdminGuard, kể cả route thêm sau này', () => {
    const thieuGuard = Object.getOwnPropertyNames(proto)
      .filter((ten) => VERB_GHI.includes(httpMethodOf(proto[ten])))
      .filter((ten) => !guardsOf(proto[ten]).includes(AdminGuard));
    expect(thieuGuard).toEqual([]);
  });
});
