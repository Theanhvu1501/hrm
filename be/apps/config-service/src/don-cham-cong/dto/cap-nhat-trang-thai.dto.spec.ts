import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CapNhatTrangThaiDto } from './cap-nhat-trang-thai.dto';

/**
 * Khoá trực tiếp decorator class-validator trên CapNhatTrangThaiDto — KHÔNG
 * gọi thẳng `DonChamCong_Service.updateStatus()`. Gọi service sẽ bỏ qua
 * `ValidationPipe` hoàn toàn (service nhận `trangThai: string` trần trụi),
 * nên test sẽ xanh kể cả khi xoá sạch decorator trên DTO — đúng bẫy đã dính
 * ở don-cham-cong.service.spec.ts (mock che mất lỗ hổng đang truy), lần này
 * xảy ra ở tầng validate thay vì tầng mock.
 *
 * `validate(dto, { whitelist: true, forbidNonWhitelisted: true })` mô phỏng
 * đúng ValidationPipe global trong main.ts.
 */

const TUY_CHON_KHOP_MAIN = { whitelist: true, forbidNonWhitelisted: true };

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

describe('CapNhatTrangThaiDto', () => {
  describe('trangThai', () => {
    it.each(['cho_duyet', 'da_duyet', 'tu_choi'])(
      "chấp nhận trangThai = '%s'",
      async (trangThaiHopLe) => {
        const dto = plainToInstance(CapNhatTrangThaiDto, {
          trangThai: trangThaiHopLe,
        });

        const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

        expect(timDoiLoiTruong(errors, 'trangThai')).toBeUndefined();
      },
    );

    it("từ chối trangThai = 'linh_tinh' (chuỗi bất kỳ) với ràng buộc isIn", async () => {
      const dto = plainToInstance(CapNhatTrangThaiDto, {
        trangThai: 'linh_tinh',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'trangThai');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('isIn');
    });

    it('từ chối khi thiếu hẳn trangThai — không phải @IsOptional, tránh lưu undefined xuống DB', async () => {
      const dto = plainToInstance(CapNhatTrangThaiDto, {});

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'trangThai');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('isIn');
    });
  });

  describe('nguoiDuyet', () => {
    it('chấp nhận nguoiDuyet là chuỗi hợp lệ', async () => {
      const dto = plainToInstance(CapNhatTrangThaiDto, {
        trangThai: 'da_duyet',
        nguoiDuyet: 'Manager A',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'nguoiDuyet')).toBeUndefined();
    });

    it('không truyền nguoiDuyet thì không phát sinh lỗi ở tầng DTO', async () => {
      const dto = plainToInstance(CapNhatTrangThaiDto, {
        trangThai: 'da_duyet',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'nguoiDuyet')).toBeUndefined();
    });
  });

  describe('trường lạ (forbidNonWhitelisted)', () => {
    it("từ chối trường lạ 'employeeId' gửi kèm payload hợp lệ", async () => {
      const dto = plainToInstance(CapNhatTrangThaiDto, {
        trangThai: 'da_duyet',
        employeeId: 'nv-khac',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'employeeId');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('whitelistValidation');
    });
  });
});
