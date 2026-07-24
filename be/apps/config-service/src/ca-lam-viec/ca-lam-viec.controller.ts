import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CaLamViec_Service } from './ca-lam-viec.service';
import type { CaLamViecFilter } from './ca-lam-viec.service';
import { CreateCaLamViecDto, UpdateCaLamViecDto } from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Ca làm việc là mốc so sánh duy nhất để tính đi muộn/về sớm. Nhân viên sửa
 * được `gioBatDau` ca của mình thành 23:00 là không bao giờ muộn nữa, nên
 * mọi thao tác GHI phải là quản trị.
 *
 * Hàng rào là `PermissionGuard` + `@Permissions('/cham-cong/ca-lam-viec:...')`,
 * KHÔNG phải `AdminGuard`: `AdminGuard` chỉ cho qua khi `vaiTro` viết hoa lên
 * bằng `'ADMIN'`/`'SUPER_ADMIN'`, nhưng `vaiTro` do `JwtGuard` nạp từ
 * `app_user_roles.role` — là TÊN VAI TRÒ tự do từng tenant tự đặt ("Quản trị
 * hệ thống", "Quản lý"...). Trên production không ai có đúng chuỗi "ADMIN"
 * nên AdminGuard chặn cả HR thật, mọi thao tác ghi ca làm việc trả 403.
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
 *
 * `@Get` CÓ gắn `:xem` — đúng key `fe/src/config/routePermissions.ts` dùng để
 * gate màn hình Ca làm việc. Lưu ý: `GET /ca-lam-viec` còn được gọi từ tab
 * "Chấm công" trong hồ sơ nhân viên (ChamCongTab.tsx), nên vai trò mở được
 * hồ sơ nhân viên cũng cần `/cham-cong/ca-lam-viec:xem` — script
 * `ops/grant-quyen-module-moi.ts` không đụng tới module này vì dữ liệu
 * production đã có sẵn đủ quyền ca-lam-viec.
 */
@Controller('ca-lam-viec')
@UseGuards(JwtGuard)
export class CaLamViec_Controller {
  constructor(private readonly caLamViec_Service: CaLamViec_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ca-lam-viec:xem')
  async findAll(@Query() query: CaLamViecFilter) {
    const data = await this.caLamViec_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ca-lam-viec:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.caLamViec_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ca-lam-viec:them')
  async create(@Body() body: CreateCaLamViecDto) {
    const data = await this.caLamViec_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ca-lam-viec:sua')
  async update(@Param('id') id: string, @Body() body: UpdateCaLamViecDto) {
    const data = await this.caLamViec_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ca-lam-viec:xoa')
  async remove(@Param('id') id: string) {
    await this.caLamViec_Service.remove(id);
    return { success: true, message: 'Xóa ca làm việc thành công' };
  }
}
