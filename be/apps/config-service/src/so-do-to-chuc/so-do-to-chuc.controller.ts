import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { SoDoToChuc_Service } from './so-do-to-chuc.service';
import { CreateOrgUnitDto, UpdateOrgUnitDto } from './dto';

/**
 * Sơ đồ tổ chức (yêu cầu d13). Hàng rào là `PermissionGuard` +
 * `@Permissions('/nhan-su/so-do-to-chuc:...')`, cùng khuôn với các module
 * khác — KHÔNG dùng `AdminGuard` (chỉ nhận đúng chuỗi vai trò 'ADMIN', trên
 * production không ai có) và KHÔNG dùng `@Roles(...)` (`RoleGuard` hiện chỉ
 * `return true`).
 *
 * Đây là MODULE QUYỀN MỚI: phải chạy `ops/grant-quyen-module-moi.ts` lúc
 * deploy, nếu không màn hình 403 với tất cả mọi người.
 */
@Controller('so-do-to-chuc')
@UseGuards(JwtGuard)
export class SoDoToChuc_Controller {
  constructor(private readonly service: SoDoToChuc_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/so-do-to-chuc:xem')
  async cay() {
    return { success: true, data: await this.service.cay() };
  }

  /**
   * Ô chọn chức danh ở Hồ sơ nhân viên và Quá trình công tác gọi endpoint
   * này, nên quyền phải là quyền của MÀN HÌNH HỒ SƠ chứ không phải quyền
   * quản trị sơ đồ tổ chức — nếu không, HR nhập hồ sơ mà không được cấp
   * quyền sơ đồ tổ chức sẽ thấy ô chức danh rỗng không hiểu vì sao.
   */
  @Get('chuc-danh')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xem')
  async danhSachChucDanh() {
    return { success: true, data: await this.service.danhSachChucDanh() };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/so-do-to-chuc:them')
  async create(@Body() dto: CreateOrgUnitDto) {
    return { success: true, data: await this.service.create(dto) };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/so-do-to-chuc:sua')
  async update(@Param('id') id: string, @Body() dto: UpdateOrgUnitDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/so-do-to-chuc:xoa')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true, message: 'Đã xoá đơn vị' };
  }
}
