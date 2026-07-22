import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { CreateDiaDiemChamCongDto } from './create-dia-diem-cham-cong.dto';
import { UpdateDiaDiemChamCongDto } from './update-dia-diem-cham-cong.dto';

/**
 * Test này khoá trực tiếp các decorator class-validator trên
 * CreateDiaDiemChamCongDto / UpdateDiaDiemChamCongDto — không đi qua service.
 *
 * Lý do: dia-diem-cham-cong.service.spec.ts gọi thẳng service.create(...) với
 * object thường (`as any`), nên hoàn toàn bỏ qua tầng class-validator. Nếu ai
 * đó lỡ xoá @Min(20)/@Max(5000) hoặc đổi @IsIn(...) trên DTO, các test service
 * vẫn xanh 100% vì decorator không hề chạy trong luồng đó.
 */

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

const BASE_GPS_HOP_LE = {
  ten: 'Văn phòng chính',
  loai: 'gps',
  latitude: 10.7769,
  longitude: 106.7009,
};

describe.each([
  ['CreateDiaDiemChamCongDto', CreateDiaDiemChamCongDto],
  ['UpdateDiaDiemChamCongDto', UpdateDiaDiemChamCongDto],
] as const)('%s — ràng buộc validate', (tenDto, DtoClass) => {
  // ──────────────────────────────────────────────────────────────────────────
  // banKinh: @Min(20) / @Max(5000)
  // ──────────────────────────────────────────────────────────────────────────
  describe('banKinh', () => {
    it('chấp nhận banKinh = 20 (đúng biên dưới)', async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_GPS_HOP_LE,
        banKinh: 20,
      });

      const errors = await validate(dto);

      expect(timDoiLoiTruong(errors, 'banKinh')).toBeUndefined();
    });

    it('từ chối banKinh = 19 (dưới biên dưới) với ràng buộc min', async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_GPS_HOP_LE,
        banKinh: 19,
      });

      const errors = await validate(dto);
      const loiBanKinh = timDoiLoiTruong(errors, 'banKinh');

      expect(loiBanKinh).toBeDefined();
      expect(loiBanKinh?.constraints).toHaveProperty('min');
    });

    it('chấp nhận banKinh = 5000 (đúng biên trên)', async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_GPS_HOP_LE,
        banKinh: 5000,
      });

      const errors = await validate(dto);

      expect(timDoiLoiTruong(errors, 'banKinh')).toBeUndefined();
    });

    it('từ chối banKinh = 5001 (vượt biên trên) với ràng buộc max', async () => {
      const dto = plainToInstance(DtoClass, {
        ...BASE_GPS_HOP_LE,
        banKinh: 5001,
      });

      const errors = await validate(dto);
      const loiBanKinh = timDoiLoiTruong(errors, 'banKinh');

      expect(loiBanKinh).toBeDefined();
      expect(loiBanKinh?.constraints).toHaveProperty('max');
    });

    it('không truyền banKinh thì không phát sinh lỗi ở tầng DTO (bắt buộc theo loai nằm ở service)', async () => {
      const dto = plainToInstance(DtoClass, { ...BASE_GPS_HOP_LE });

      const errors = await validate(dto);

      expect(timDoiLoiTruong(errors, 'banKinh')).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // loai: @IsIn(['gps', 'wifi', 'qr'])
  // ──────────────────────────────────────────────────────────────────────────
  describe('loai', () => {
    it.each(['gps', 'wifi', 'qr'])(
      "chấp nhận loai = '%s'",
      async (loaiHopLe) => {
        const dto = plainToInstance(DtoClass, {
          ten: 'Địa điểm hợp lệ',
          loai: loaiHopLe,
        });

        const errors = await validate(dto);

        expect(timDoiLoiTruong(errors, 'loai')).toBeUndefined();
      },
    );

    it.each(['GPS', 'gpss', ''])(
      "từ chối loai = '%s' với ràng buộc isIn",
      async (loaiKhongHopLe) => {
        const dto = plainToInstance(DtoClass, {
          ten: 'Địa điểm không hợp lệ',
          loai: loaiKhongHopLe,
        });

        const errors = await validate(dto);
        const loiLoai = timDoiLoiTruong(errors, 'loai');

        expect(loiLoai).toBeDefined();
        expect(loiLoai?.constraints).toHaveProperty('isIn');
      },
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────
// UpdateDiaDiemChamCongDto qua PartialType — luồng cập nhật một phần
// ──────────────────────────────────────────────────────────────────────────
describe('UpdateDiaDiemChamCongDto — cập nhật một phần (partial update)', () => {
  it('gửi chỉ mỗi banKinh = 19 (không kèm trường nào khác) vẫn bị từ chối với ràng buộc min', async () => {
    const dto = plainToInstance(UpdateDiaDiemChamCongDto, {
      banKinh: 19,
    });

    const errors = await validate(dto);
    const loiBanKinh = timDoiLoiTruong(errors, 'banKinh');

    expect(loiBanKinh).toBeDefined();
    expect(loiBanKinh?.constraints).toHaveProperty('min');
  });

  it('gửi chỉ mỗi banKinh = 5001 (không kèm trường nào khác) vẫn bị từ chối với ràng buộc max', async () => {
    const dto = plainToInstance(UpdateDiaDiemChamCongDto, {
      banKinh: 5001,
    });

    const errors = await validate(dto);
    const loiBanKinh = timDoiLoiTruong(errors, 'banKinh');

    expect(loiBanKinh).toBeDefined();
    expect(loiBanKinh?.constraints).toHaveProperty('max');
  });

  it('gửi chỉ mỗi loai không hợp lệ (không kèm trường nào khác) vẫn bị từ chối với ràng buộc isIn', async () => {
    const dto = plainToInstance(UpdateDiaDiemChamCongDto, {
      loai: 'GPS',
    });

    const errors = await validate(dto);
    const loiLoai = timDoiLoiTruong(errors, 'loai');

    expect(loiLoai).toBeDefined();
    expect(loiLoai?.constraints).toHaveProperty('isIn');
  });
});
