import { METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminGuard, JwtGuard } from '@app/auth';
import { CaLamViec_Controller } from './ca-lam-viec.controller';

/**
 * Ca làm việc là mốc so sánh duy nhất để tính đi muộn/về sớm. Nhân viên sửa
 * được `gioBatDau` ca của mình thành 23:00 là không bao giờ muộn nữa — nên
 * mọi thao tác GHI phải là quản trị.
 *
 * `@Get` CỐ Ý chỉ giữ JwtGuard: FE gọi `GET /ca-lam-viec` bằng token thường
 * ở tab "Chấm công" trong hồ sơ nhân viên
 * (fe/src/pages/nhan-su/ho-so-nhan-vien/components/form/tabs/ChamCongTab.tsx)
 * và ở màn hình Ca làm việc. Bọc GET sẽ làm vỡ hai màn hình đó.
 */

const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

const httpMethodOf = (fn: any): RequestMethod =>
  Reflect.getMetadata(METHOD_METADATA, fn);

const proto = CaLamViec_Controller.prototype as any;

const VERB_GHI = [
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
];

describe('CaLamViec_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(CaLamViec_Controller)).toContain(JwtGuard);
  });

  it.each([['create'], ['update'], ['remove']])(
    'route ghi %s phải có AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).toContain(AdminGuard);
    },
  );

  it.each([['findAll'], ['findOne']])(
    'route đọc %s KHÔNG gắn AdminGuard (FE gọi bằng token thường)',
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
