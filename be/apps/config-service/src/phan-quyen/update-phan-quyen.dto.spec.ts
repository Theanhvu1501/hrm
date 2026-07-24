import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreatePhanQuyenDto } from './create-phan-quyen.dto';
import { UpdatePhanQuyenDto } from './update-phan-quyen.dto';
import { UpsertPermissionsDto } from './upsert-permissions.dto';

/**
 * Khoá trực tiếp decorator class-validator — KHÔNG gọi
 * `PhanQuyen_Service.update()`. Gọi service sẽ bỏ qua `ValidationPipe` hoàn
 * toàn (service nhận `Partial<PhanQuyen>` trần trụi), nên test vẫn xanh kể cả
 * khi route quay về `@Body() updateDto: any` — đúng lỗ hổng đang vá.
 *
 * `validate(dto, { whitelist: true, forbidNonWhitelisted: true })` mô phỏng
 * đúng ValidationPipe global trong `config-service/src/main.ts`.
 */

const TUY_CHON_KHOP_MAIN = { whitelist: true, forbidNonWhitelisted: true };

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

/**
 * Ba DTO này là BA ĐƯỜNG GHI khác nhau vào cùng một cột
 * `phan_quyen.permissions`. Chạy chung một bảng test để nếu ai đó nới khuôn
 * ở một đường mà quên hai đường kia thì đỏ ngay — chính sự lệch nhau giữa
 * `UpsertPermissionsDto` (đã chặn `'*'`) và `@Body() updateDto: any` (không
 * chặn gì) là toàn bộ lỗ hổng leo thang quyền của vòng này.
 */
const CAC_DUONG_GHI_PERMISSIONS: Array<[string, any]> = [
  ['UpsertPermissionsDto', UpsertPermissionsDto],
  ['CreatePhanQuyenDto', CreatePhanQuyenDto],
  ['UpdatePhanQuyenDto', UpdatePhanQuyenDto],
];

describe('DTO phân quyền — cột permissions', () => {
  it.each(CAC_DUONG_GHI_PERMISSIONS)(
    "%s từ chối permissions = ['*'] (PermissionGuard hiểu '*' là toàn quyền)",
    async (_ten, DtoClass) => {
      const dto = plainToInstance(DtoClass, {
        vaiTro: 'Nhân viên',
        ten: 'Nhân viên',
        permissions: ['*'],
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'permissions');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('matches');
    },
  );

  it.each(CAC_DUONG_GHI_PERMISSIONS)(
    '%s từ chối chuỗi quyền có ký tự đại diện lẫn trong đường dẫn hợp lệ',
    async (_ten, DtoClass) => {
      const dto = plainToInstance(DtoClass, {
        vaiTro: 'Nhân viên',
        ten: 'Nhân viên',
        permissions: ['/cham-cong/don-tu:xem', '/nhan-su/*:sua'],
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'permissions')).toBeDefined();
    },
  );

  it.each(CAC_DUONG_GHI_PERMISSIONS)(
    '%s chấp nhận chuỗi quyền đúng khuôn /module:action',
    async (_ten, DtoClass) => {
      const dto = plainToInstance(DtoClass, {
        vaiTro: 'Nhân viên',
        ten: 'Nhân viên',
        permissions: ['/cham-cong/don-tu:xem', '/cham-cong/don-tu:them'],
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'permissions')).toBeUndefined();
    },
  );
});

describe('UpdatePhanQuyenDto', () => {
  it('cho phép body chỉ có permissions (PUT :id không bắt gửi lại vaiTro/ten)', async () => {
    const dto = plainToInstance(UpdatePhanQuyenDto, {
      permissions: ['/cham-cong/don-tu:xem'],
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toEqual([]);
  });

  it("từ chối trường lạ 'isActive' — tắt vai trò là việc của DELETE (:xoa)", async () => {
    const dto = plainToInstance(UpdatePhanQuyenDto, {
      permissions: ['/cham-cong/don-tu:xem'],
      isActive: false,
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
    const loi = timDoiLoiTruong(errors, 'isActive');

    expect(loi).toBeDefined();
    expect(loi?.constraints).toHaveProperty('whitelistValidation');
  });

  it("từ chối trường lạ 'tenantId' — không cho chuyển vai trò sang tenant khác qua body", async () => {
    const dto = plainToInstance(UpdatePhanQuyenDto, {
      tenantId: 'tenant-khac',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
    const loi = timDoiLoiTruong(errors, 'tenantId');

    expect(loi).toBeDefined();
    expect(loi?.constraints).toHaveProperty('whitelistValidation');
  });
});

describe('CreatePhanQuyenDto', () => {
  it('bắt buộc vaiTro và ten — không tạo được hàng phân quyền vô danh', async () => {
    const dto = plainToInstance(CreatePhanQuyenDto, {});

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(timDoiLoiTruong(errors, 'vaiTro')).toBeDefined();
    expect(timDoiLoiTruong(errors, 'ten')).toBeDefined();
  });
});
