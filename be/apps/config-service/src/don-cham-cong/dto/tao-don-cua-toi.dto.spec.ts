import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { TaoDonCuaToiDto } from './tao-don-cua-toi.dto';

/**
 * Khoá trực tiếp việc `employeeId`/`trangThai`/`nguoiDuyet` KHÔNG TỒN TẠI
 * trên TaoDonCuaToiDto — không phải "có nhưng optional", không phải "có
 * nhưng bị bỏ qua ở service". Nếu ai đó lỡ đưa lại các trường này vào DTO
 * (vd copy nhầm từ CreateDonChamCongDto), test này phải đỏ ngay, mô phỏng
 * đúng option `{ whitelist: true, forbidNonWhitelisted: true }` mà
 * `main.ts` bật global.
 */
const TUY_CHON_KHOP_MAIN = { whitelist: true, forbidNonWhitelisted: true };

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

const DON_HOP_LE = {
  loaiDon: 'giai_trinh',
  ngay: '2026-07-23',
  lyDo: 'Quên chấm công',
};

describe('TaoDonCuaToiDto', () => {
  it('payload hợp lệ (không employeeId/trangThai/nguoiDuyet) không phát sinh lỗi', async () => {
    const dto = plainToInstance(TaoDonCuaToiDto, { ...DON_HOP_LE });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toHaveLength(0);
  });

  it.each(['employeeId', 'trangThai', 'nguoiDuyet'])(
    "từ chối trường '%s' gửi kèm payload hợp lệ (forbidNonWhitelisted) — trường này KHÔNG được tồn tại trên DTO",
    async (truongBiCam) => {
      const dto = plainToInstance(TaoDonCuaToiDto, {
        ...DON_HOP_LE,
        [truongBiCam]: 'gia-tri-bat-ky',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, truongBiCam);

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('whitelistValidation');
    },
  );
});

/**
 * Đơn làm online đi qua ĐÚNG DTO này khi nhân viên tự nộp. `TaoDonCuaToiDto`
 * là `OmitType(CreateDonChamCongDto, …)` nên nó thừa hưởng `@IsIn` của
 * `loaiDon` — test này khoá điều đó lại: nới loại đơn ở lớp cha mà quên lớp
 * con (hoặc ngược lại, ai đó chép một `@IsIn` thứ hai vào đây) đều phải đỏ.
 */
describe('TaoDonCuaToiDto — đơn làm online', () => {
  it('nhận đơn làm online nhiều ngày', async () => {
    const dto = plainToInstance(TaoDonCuaToiDto, {
      loaiDon: 'lam_online',
      ngay: '2026-08-10',
      denNgay: '2026-08-12',
      lyDo: 'Làm ở nhà',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toStrictEqual([]);
  });

  it('nhận đơn làm online nửa buổi', async () => {
    const dto = plainToInstance(TaoDonCuaToiDto, {
      loaiDon: 'lam_online',
      ngay: '2026-08-10',
      denNgay: '2026-08-10',
      buoi: 'sang',
      lyDo: 'Sáng ở nhà, chiều lên văn phòng',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toStrictEqual([]);
  });

  it("vẫn từ chối loại đơn lạ ('wfh')", async () => {
    const dto = plainToInstance(TaoDonCuaToiDto, {
      loaiDon: 'wfh',
      ngay: '2026-08-10',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(timDoiLoiTruong(errors, 'loaiDon')).toBeDefined();
  });
});
