import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Body của `PATCH /don-cham-cong/:id/trang-thai` — route DUY NHẤT được phép
 * di chuyển trạng thái đơn (xem comment ở `DonChamCong_Service.update()` và
 * `.updateStatus()`), nên đây phải là body được canh kỹ nhất trong module.
 *
 * Trước vòng sửa 2 (task-4-fix2), controller khai body bằng inline type
 * (`{ trangThai: string; nguoiDuyet?: string }`) — inline type không có
 * metatype thật nên `ValidationPipe` toàn cục BỎ QUA HOÀN TOÀN tham số này:
 * `trangThai` nhận chuỗi bất kỳ, hoặc thiếu hẳn (khi đó
 * `item.trangThai = undefined` bị lưu thẳng xuống DB, xem
 * `DonChamCong_Service.updateStatus()`). Dùng class thật ở đây để pipe có
 * metatype mà validate.
 */
export class CapNhatTrangThaiDto {
  @IsIn(['cho_duyet', 'da_duyet', 'tu_choi'], {
    message: 'Trạng thái không hợp lệ',
  })
  trangThai: string;

  @IsOptional()
  @IsString()
  nguoiDuyet?: string;
}
