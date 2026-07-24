import { OmitType } from '@nestjs/mapped-types';
import { CreateDonChamCongDto } from './create-don-cham-cong.dto';

/**
 * DTO nộp đơn CHO CHÍNH MÌNH — route `POST /don-cham-cong/cua-toi`.
 *
 * `OmitType` XOÁ HẲN ba trường dưới đây khỏi lớp (không phải "có nhưng bị bỏ
 * qua"), để pipe `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
 * khai global trong `main.ts` tự chặn ngay nếu client vẫn cố gửi kèm:
 *
 *  - `employeeId`: đây chính là lỗ hổng Task 4 vá — route `cua-toi` LUÔN suy
 *    nhân viên từ token qua `NhanVien_Service.resolveEmployeeFromUser(req.user)`
 *    trong controller, không bao giờ đọc từ body. Nếu trường này còn tồn tại
 *    (dù có `@IsOptional`) thì một lập trình viên sau này chỉ cần vô tình
 *    spread `...body` xuống service là mở lại đúng lỗ hổng "tạo đơn hộ người
 *    khác" đang được vá ở đây.
 *  - `trangThai`, `nguoiDuyet`: đây là KẾT QUẢ của luồng DUYỆT đơn
 *    (`PATCH :id/trang-thai`), không phải điều người NỘP đơn được tự khai —
 *    cùng lý lẽ CreateDonChamCongDto đã áp dụng cho các trường backend tự
 *    tính soNgayNghi/soGioOt/heSoOt/loaiNgayOt (Task 3). Cho phép tự khai
 *    trangThai='da_duyet' lúc tạo tương đương với tự duyệt đơn của mình.
 */
export class TaoDonCuaToiDto extends OmitType(CreateDonChamCongDto, [
  'employeeId',
  'trangThai',
  'nguoiDuyet',
] as const) {}
