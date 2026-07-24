import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdateDonChamCongDto } from './update-don-cham-cong.dto';

/**
 * Phát hiện trong lúc tự rà soát Task 4 (không có trong brief gốc): chặn tự
 * duyệt hiện chỉ nằm trong `DonChamCong_Service.updateStatus()`
 * (`PATCH :id/trang-thai`). Nhưng `PUT :id` (route quản trị, dùng
 * UpdateDonChamCongDto) vẫn có thể set thẳng `trangThai: 'da_duyet'` mà
 * KHÔNG đi qua updateStatus() — một admin đồng thời là chủ đơn gọi PUT thay
 * vì PATCH sẽ tự duyệt được đơn của chính mình, vô hiệu hoá hoàn toàn luật
 * KHONG_TU_DUYET_DON.
 *
 * Vá bằng cách xoá hẳn `trangThai`/`nguoiDuyet` khỏi UpdateDonChamCongDto —
 * đổi trạng thái CHỈ được phép qua route PATCH chuyên biệt. Đã xác minh FE
 * (`DonChamCongForm.tsx` → `onSubmit`) không bao giờ gửi hai trường này qua
 * `update()`, chỉ gửi qua `updateStatus()` riêng — nên không phá FE hiện có.
 */
const TUY_CHON_KHOP_MAIN = { whitelist: true, forbidNonWhitelisted: true };

function timDoiLoiTruong(
  errors: ValidationError[],
  property: string,
): ValidationError | undefined {
  return errors.find((e) => e.property === property);
}

describe('UpdateDonChamCongDto — không cho đổi trạng thái qua PUT', () => {
  it.each(['trangThai', 'nguoiDuyet'])(
    "từ chối trường '%s' (forbidNonWhitelisted) — đổi trạng thái chỉ được qua PATCH :id/trang-thai",
    async (truongBiCam) => {
      const dto = plainToInstance(UpdateDonChamCongDto, {
        lyDo: 'Sửa lý do',
        [truongBiCam]:
          truongBiCam === 'trangThai' ? 'da_duyet' : 'Ai đó tự ghi',
      });

      const errors = await validate(dto, TUY_CHON_KHOP_MAIN);
      const loi = timDoiLoiTruong(errors, truongBiCam);

      expect(loi).toBeDefined();
      expect(loi?.constraints).toHaveProperty('whitelistValidation');
    },
  );

  it('vẫn cho sửa các trường thông thường khác (vd lyDo, ghiChu)', async () => {
    const dto = plainToInstance(UpdateDonChamCongDto, {
      lyDo: 'Sửa lý do',
      ghiChu: 'Ghi chú thêm',
    });

    const errors = await validate(dto, TUY_CHON_KHOP_MAIN);

    expect(errors).toHaveLength(0);
  });
});
