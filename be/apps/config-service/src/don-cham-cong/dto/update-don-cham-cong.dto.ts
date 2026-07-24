import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';

/**
 * `trangThai`/`nguoiDuyet` bị OmitType XOÁ HẲN khỏi DTO này (Task 4, phát
 * hiện lúc tự rà soát — không có trong brief gốc): nếu còn ở đây, `PUT :id`
 * (route quản trị) có thể set thẳng `trangThai: 'da_duyet'` mà KHÔNG đi qua
 * `DonChamCong_Service.updateStatus()` — nơi DUY NHẤT chặn tự duyệt
 * (KHONG_TU_DUYET_DON). Một admin đồng thời là chủ đơn gọi PUT thay vì
 * PATCH sẽ tự duyệt được đơn của chính mình, vô hiệu hoá hoàn toàn luật đó.
 * Đổi trạng thái CHỈ được phép qua `PATCH :id/trang-thai`.
 */
export class UpdateDonChamCongDto extends PartialType(
  OmitType(CreateDonChamCongDto, ['trangThai', 'nguoiDuyet'] as const),
) {}
