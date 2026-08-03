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
import {
  CreateHopDongDto,
  UpdateHopDongDto,
  UpsertMauInHopDongDto,
  UpdateThongTinCongTyDto,
} from './dto';
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

  // ── Mẫu in hợp đồng (`mau-in`) và thông tin công ty (`cong-ty`) — route
  // TĨNH, phải khai TRƯỚC `:id` bên dưới, nếu không Nest khớp "mau-in"/
  // "cong-ty" vào tham số `:id` (cùng 1 đoạn URL, cùng phương thức GET).

  @Get('mau-in')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xem')
  async getMauIn() {
    const data = await this.hopDong_Service.getMauIn();
    return { success: true, data };
  }

  @Put('mau-in')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:sua')
  async upsertMauIn(@Body() dto: UpsertMauInHopDongDto) {
    const data = await this.hopDong_Service.upsertMauIn(dto.html);
    return { success: true, data };
  }

  @Delete('mau-in')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:sua')
  async removeMauIn() {
    await this.hopDong_Service.removeMauIn();
    return { success: true, message: 'Đã khôi phục mẫu in mặc định' };
  }

  @Get('cong-ty')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xem')
  async getThongTinCongTy() {
    const data = await this.hopDong_Service.getThongTinCongTy();
    return { success: true, data };
  }

  @Put('cong-ty')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:sua')
  async upsertThongTinCongTy(@Body() dto: UpdateThongTinCongTyDto) {
    const data = await this.hopDong_Service.upsertThongTinCongTy(dto);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.hopDong_Service.findOne(id);
    return { success: true, data };
  }

  @Get(':id/in')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/hop-dong-lao-dong:xuat')
  async renderHopDong(@Param('id') id: string) {
    const data = await this.hopDong_Service.renderHopDong(id);
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
