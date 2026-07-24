import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThoiViec_Service } from './thoi-viec.service';
import type { ThoiViecFilter } from './thoi-viec.service';
import { CreateThoiViecDto, UpdateThoiViecDto } from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Hồ sơ thôi việc quyết định ngày nghỉ việc và tình trạng bàn giao của một
 * người. Trước bản vá này controller chỉ có `JwtGuard`, tức MỌI tài khoản
 * đăng nhập tạo được một hồ sơ thôi việc cho đồng nghiệp bất kỳ.
 *
 * Hàng rào là `PermissionGuard` + `@Permissions('/nhan-su/thoi-viec:...')`,
 * cùng khuôn với các module đã siết ở 67979dd (xem chú thích dài ở
 * `ngay-le.controller.ts` về lý do KHÔNG dùng `AdminGuard` lẫn `@Roles`).
 *
 * Không route nào ở đây là tự phục vụ: các màn hình nhân viên (`/toi/*`,
 * `cham-cong/cua-toi`) không gọi `resignationService` — đã rà toàn bộ FE.
 */
@Controller('thoi-viec')
@UseGuards(JwtGuard)
export class ThoiViec_Controller {
  constructor(private readonly thoiViec_Service: ThoiViec_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/thoi-viec:xem')
  async findAll(@Query() query: ThoiViecFilter) {
    const data = await this.thoiViec_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/thoi-viec:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.thoiViec_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/thoi-viec:them')
  async create(@Body() body: CreateThoiViecDto) {
    const data = await this.thoiViec_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/thoi-viec:sua')
  async update(@Param('id') id: string, @Body() body: UpdateThoiViecDto) {
    const data = await this.thoiViec_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/thoi-viec:xoa')
  async remove(@Param('id') id: string) {
    await this.thoiViec_Service.remove(id);
    return { success: true, message: 'Xóa hồ sơ thôi việc thành công' };
  }

  @Patch(':id/trang-thai')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/thoi-viec:sua')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.thoiViec_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
