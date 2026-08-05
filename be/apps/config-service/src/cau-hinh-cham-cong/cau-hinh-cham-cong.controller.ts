import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { CauHinhChamCong_Service } from './cau-hinh-cham-cong.service';
import { CapNhatCauHinhChamCongDto } from './dto';

/**
 * Lịch làm việc tuần mức công ty ảnh hưởng TOÀN BỘ bảng công và mẫu số tính
 * phép năm — nên tách quyền riêng `/cham-cong/cau-hinh:*`, không dùng ké
 * quyền bảng công.
 *
 * `PermissionGuard`, KHÔNG `AdminGuard` (chỉ khớp `vaiTro` viết hoa đúng
 * 'ADMIN'/'SUPER_ADMIN', mà tên vai trò do từng tenant tự đặt) và KHÔNG
 * `@Roles(...)` (`RoleGuard` hiện là no-op). Cùng khuôn
 * `bang-luong.controller.ts`.
 */
@Controller('cau-hinh-cham-cong')
@UseGuards(JwtGuard)
export class CauHinhChamCong_Controller {
  constructor(private readonly service: CauHinhChamCong_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/cau-hinh:xem')
  async layCauHinh() {
    const data = await this.service.layCauHinh();
    return { success: true, data };
  }

  @Put()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/cau-hinh:sua')
  async capNhat(@Body() body: CapNhatCauHinhChamCongDto) {
    const data = await this.service.capNhat(body);
    return { success: true, data };
  }
}
