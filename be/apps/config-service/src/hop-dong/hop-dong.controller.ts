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
import { HopDong_Service } from './hop-dong.service';
import type { HopDongFilter } from './hop-dong.service';
import { CreateHopDongDto, UpdateHopDongDto } from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Hợp đồng lao động chứa lương và thời hạn của từng người — dữ liệu nhạy cảm
 * nhất trong phân hệ nhân sự. Trước bản vá này controller chỉ có `JwtGuard`,
 * tức MỌI tài khoản đăng nhập đọc được lương toàn công ty và sửa/xoá được
 * hợp đồng của bất kỳ ai.
 *
 * Hàng rào là `PermissionGuard` +
 * `@Permissions('/nhan-su/hop-dong-lao-dong:...')`, cùng khuôn với các module
 * đã siết ở 67979dd (xem chú thích dài ở `ngay-le.controller.ts` về lý do
 * KHÔNG dùng `AdminGuard` lẫn `@Roles`).
 *
 * Không route nào ở đây là tự phục vụ: các màn hình nhân viên (`/toi/*`,
 * `cham-cong/cua-toi`) không gọi `laborContractService` — đã rà toàn bộ FE.
 */
@Controller('hop-dong')
@UseGuards(JwtGuard)
export class HopDong_Controller {
  constructor(private readonly hopDong_Service: HopDong_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xem')
  async findAll(@Query() query: HopDongFilter) {
    const data = await this.hopDong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.hopDong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:them')
  async create(@Body() body: CreateHopDongDto) {
    const data = await this.hopDong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:sua')
  async update(@Param('id') id: string, @Body() body: UpdateHopDongDto) {
    const data = await this.hopDong_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xoa')
  async remove(@Param('id') id: string) {
    await this.hopDong_Service.remove(id);
    return { success: true, message: 'Xóa hợp đồng thành công' };
  }

  @Patch(':id/trang-thai')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:sua')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.hopDong_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
