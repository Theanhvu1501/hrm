import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { AdminGuard, JwtGuard } from '@app/auth';
import { NhanVien_Controller } from './nhan-vien.controller';

/**
 * Hồ sơ nhân viên là nơi neo mọi thứ của chấm công: `userId` (đường nối tài
 * khoản ↔ hồ sơ) và `workShiftId` (mốc tính muộn/sớm). Để hở thao tác ghi
 * thì nhân viên tự xoá `workShiftId` của mình là không bao giờ bị tính muộn,
 * còn xoá `userId` của đồng nghiệp là người đó mất hẳn đường chấm công.
 *
 * `@Get` CỐ Ý chỉ giữ JwtGuard:
 *  - `GET /nhan-vien` được FE gọi bằng token thường ở màn hình Bản ghi chấm
 *    công (fe/src/pages/cham-cong/ban-ghi/sub-handler/init/init.handler.ts)
 *    và ở 6 màn hình nghiệp vụ khác để đổ ô chọn nhân viên.
 *  - `GET /nhan-vien/me` là hồ sơ của CHÍNH người đang đăng nhập — mọi nhân
 *    viên đều phải xem được.
 */

const guardsOf = (fn: any): any[] =>
  Reflect.getMetadata('__guards__', fn) ?? [];

const httpMethodOf = (fn: any): RequestMethod =>
  Reflect.getMetadata(METHOD_METADATA, fn);

const proto = NhanVien_Controller.prototype as any;

const VERB_GHI = [
  RequestMethod.POST,
  RequestMethod.PUT,
  RequestMethod.PATCH,
  RequestMethod.DELETE,
];

describe('NhanVien_Controller — phân quyền', () => {
  it('class gắn JwtGuard cho toàn bộ route', () => {
    expect(guardsOf(NhanVien_Controller)).toContain(JwtGuard);
  });

  it.each([['create'], ['update'], ['remove'], ['updateStatus']])(
    'route ghi %s phải có AdminGuard',
    (ten) => {
      expect(guardsOf(proto[ten])).toContain(AdminGuard);
    },
  );

  it.each([['findAll'], ['findOne'], ['me']])(
    'route đọc %s KHÔNG gắn AdminGuard (FE gọi bằng token thường)',
    (ten) => {
      expect(guardsOf(proto[ten])).not.toContain(AdminGuard);
    },
  );

  it('updateStatus (@Patch đổi trạng thái) cũng là thao tác ghi, không được bỏ sót', () => {
    expect(httpMethodOf(proto.updateStatus)).toBe(RequestMethod.PATCH);
    expect(guardsOf(proto.updateStatus)).toContain(AdminGuard);
  });

  it('mọi route ghi đều có AdminGuard, kể cả route thêm sau này', () => {
    const thieuGuard = Object.getOwnPropertyNames(proto)
      .filter((ten) => VERB_GHI.includes(httpMethodOf(proto[ten])))
      .filter((ten) => !guardsOf(proto[ten]).includes(AdminGuard));
    expect(thieuGuard).toEqual([]);
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
