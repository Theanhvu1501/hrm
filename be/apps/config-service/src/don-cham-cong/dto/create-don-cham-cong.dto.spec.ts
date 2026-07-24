import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';
import { UpdateDonChamCongDto } from './update-don-cham-cong.dto';

/**
 * Test này khoá trực tiếp các decorator class-validator trên
 * CreateDonChamCongDto / UpdateDonChamCongDto — không đi qua service.
 *
 * Lý do (bẫy đã gặp hai lần trong dự án này): don-cham-cong.service.spec.ts
 * gọi thẳng service.create(...) với object `as any`, nên hoàn toàn bỏ qua
 * tầng class-validator. Nếu ai đó lỡ nới `loaiDon`, đổi `@IsIn(...)` trên
 * `buoi`, hoặc — nghiêm trọng hơn — thêm `soNgayNghi`/`soGioOt`/`heSoOt`/
 * `loaiNgayOt` vào DTO (các trường backend TỰ TÍNH, Task 3), các test service
 * vẫn xanh 100% vì decorator không hề chạy trong luồng đó.
 *
 * `validate(dto, { whitelist: true, forbidNonWhitelisted: true })` mô phỏng
 * đúng cấu hình ValidationPipe global trong `main.ts` — đây là điều kiện bắt
 * buộc để test `heSoOt` bên dưới có ý nghĩa: nếu gọi `validate(dto)` không
 * kèm option thì field lạ không hề bị báo lỗi, và test sẽ luôn xanh dù DTO
 * có lỗ hổng hay không.
 */

const TUY_CHON_KHOP_MAIN = { whitelist: true, forbidNonWhitelisted: true };

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

const BASE_DON_HOP_LE = {
  employeeId: 'nv-001',
  loaiDon: 'giai_trinh',
  ngay: '2026-07-23',
};

describe.each([
  ['CreateDonChamCongDto', CreateDonChamCongDto],
  ['UpdateDonChamCongDto', UpdateDonChamCongDto],
] as const)('%s — ràng buộc validate', (tenDto, DtoClass) => {
  // ──────────────────────────────────────────────────────────────────────────
  // loaiDon: @IsIn(['giai_trinh', 'lam_them_gio', 'nghi_phep', 'nghi_bu'])
  // ──────────────────────────────────────────────────────────────────────────
  describe('loaiDon', () => {
    it.each(['giai_trinh', 'lam_them_gio', 'nghi_phep', 'nghi_bu'])(
      "chấp nhận loaiDon = '%s'",
      async (loaiHopLe) => {
        const dto = plainToInstance(DtoClass, {
          ...BASE_DON_HOP_LE,
          loaiDon: loaiHopLe,
        });

        const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

        expect(timDoiLoiTruong(errors, 'loaiDon')).toBeUndefined();
      },
    );

    it("từ chối loaiDon = 'linh_tinh' với ràng buộc isIn", async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_DON_HOP_LE,
        loaiDon: 'linh_tinh',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'loaiDon');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('isIn');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // buoi: @IsIn(['ca_ngay', 'sang', 'chieu'])
  // ──────────────────────────────────────────────────────────────────────────
  describe('buoi', () => {
    it.each(['ca_ngay', 'sang', 'chieu'])(
      "chấp nhận buoi = '%s'",
      async (buoiHopLe) => {
        const dto = plainToInstance(DtoClass, {
          ...BASE_DON_HOP_LE,
          buoi: buoiHopLe,
        });

        const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

        expect(timDoiLoiTruong(errors, 'buoi')).toBeUndefined();
      },
    );

    it("từ chối buoi = 'toi' với ràng buộc isIn", async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_DON_HOP_LE,
        buoi: 'toi',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'buoi');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('isIn');
    });

    it('không truyền buoi thì không phát sinh lỗi ở tầng DTO', async () => {
      const dto = plainToInstance(DtoClass, { ...BASE_DON_HOP_LE });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'buoi')).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // loaiNghi: @IsIn(['phep_nam','khong_luong','om_dau','thai_san','cuoi_hoi','tang'])
  // ──────────────────────────────────────────────────────────────────────────
  describe('loaiNghi', () => {
    it.each([
      'phep_nam',
      'khong_luong',
      'om_dau',
      'thai_san',
      'cuoi_hoi',
      'tang',
    ])("chấp nhận loaiNghi = '%s'", async (loaiHopLe) => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_DON_HOP_LE,
        loaiNghi: loaiHopLe,
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'loaiNghi')).toBeUndefined();
    });

    it("từ chối loaiNghi = 'nghi_le' với ràng buộc isIn", async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_DON_HOP_LE,
        loaiNghi: 'nghi_le',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'loaiNghi');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('isIn');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // denNgay: @IsOptional @IsString — chỉ là ngày kết thúc khoảng nghỉ
  // ──────────────────────────────────────────────────────────────────────────
  describe('denNgay', () => {
    it('chấp nhận denNgay là chuỗi ngày hợp lệ', async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_DON_HOP_LE,
        denNgay: '2026-07-25',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

      expect(timDoiLoiTruong(errors, 'denNgay')).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Các trường BACKEND TỰ TÍNH — tuyệt đối không được có mặt trong DTO.
  // Đây là test quan trọng nhất của task: nếu ai đó lỡ thêm các trường này
  // vào DTO (hoặc gọi validate() thiếu option whitelist/forbidNonWhitelisted),
  // test này phải đỏ ngay lập tức.
  // ──────────────────────────────────────────────────────────────────────────
  describe('các trường tự tính (không được nhận từ client)', () => {
    it('từ chối heSoOt = 3.0 gửi kèm payload hợp lệ (forbidNonWhitelisted)', async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_DON_HOP_LE,
        loaiDon: 'lam_them_gio',
        heSoOt: 3.0,
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, 'heSoOt');

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('whitelistValidation');
    });

    it.each(['soNgayNghi', 'soGioOt', 'loaiNgayOt'])(
      "từ chối trường lạ '%s' gửi kèm payload hợp lệ (forbidNonWhitelisted)",
      async (truongLa) => {
        const dto = plainToInstance(DtoClass, {
          ...BASE_DON_HOP_LE,
          [truongLa]: 'gia-tri-bat-ky',
        });

        const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
        const loi = timDoiLoiTruong(errors, truongLa);

        expect(loi).toBeDefined();
        expect(loi?.constraints).toHaveProperty('whitelistValidation');
      },
    );
  });
});
