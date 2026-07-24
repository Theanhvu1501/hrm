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
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';
import type { QuaTrinhCongTacFilter } from './qua-trinh-cong-tac.service';
import {
  CreateQuaTrinhCongTacDto,
  UpdateQuaTrinhCongTacDto,
} from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Quá trình công tác là lịch sử chức danh/phòng ban/mức lương theo thời gian
 * của từng người. Trước bản vá này controller chỉ có `JwtGuard`, tức MỌI tài
 * khoản đăng nhập đọc và sửa được lịch sử lương của cả công ty.
 *
 * Hàng rào là `PermissionGuard` +
 * `@Permissions('/nhan-su/qua-trinh-cong-tac:...')`, cùng khuôn với các module
 * đã siết ở 67979dd (xem chú thích dài ở `ngay-le.controller.ts` về lý do
 * KHÔNG dùng `AdminGuard` lẫn `@Roles`).
 *
 * Không route nào ở đây là tự phục vụ: các màn hình nhân viên (`/toi/*`,
 * `cham-cong/cua-toi`) không gọi `employmentHistoryService` — đã rà toàn bộ FE.
 */
@Controller('qua-trinh-cong-tac')
@UseGuards(JwtGuard)
export class QuaTrinhCongTac_Controller {
  constructor(
    private readonly quaTrinhCongTac_Service: QuaTrinhCongTac_Service,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/qua-trinh-cong-tac:xem')
  async findAll(@Query() query: QuaTrinhCongTacFilter) {
    const data = await this.quaTrinhCongTac_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/qua-trinh-cong-tac:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.quaTrinhCongTac_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/qua-trinh-cong-tac:them')
  async create(@Body() body: CreateQuaTrinhCongTacDto) {
    const data = await this.quaTrinhCongTac_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/qua-trinh-cong-tac:sua')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateQuaTrinhCongTacDto,
  ) {
    const data = await this.quaTrinhCongTac_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/qua-trinh-cong-tac:xoa')
  async remove(@Param('id') id: string) {
    await this.quaTrinhCongTac_Service.remove(id);
    return { success: true, message: 'Xóa quá trình công tác thành công' };
  }
}
