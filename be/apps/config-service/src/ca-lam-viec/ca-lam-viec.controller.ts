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
import { AdminGuard, JwtGuard } from '@app/auth';

/**
 * Ca làm việc là mốc so sánh duy nhất để tính đi muộn/về sớm. Nhân viên sửa
 * được `gioBatDau` ca của mình thành 23:00 là không bao giờ muộn nữa, nên
 * mọi thao tác GHI phải là quản trị.
 *
 * Dùng `AdminGuard` (kiểm `vaiTro`), KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true` nên mọi `@Roles` đều vô hiệu.
 *
 * `@Get` CỐ Ý chỉ giữ `JwtGuard`: FE gọi `GET /ca-lam-viec` bằng token
 * thường ở tab "Chấm công" trong hồ sơ nhân viên (ChamCongTab.tsx) và ở màn
 * hình Ca làm việc — bọc GET sẽ làm vỡ hai màn hình đó.
 */
@Controller('ca-lam-viec')
@UseGuards(JwtGuard)
export class CaLamViec_Controller {
  constructor(private readonly caLamViec_Service: CaLamViec_Service) {}

  @Get()
  async findAll(@Query() query: CaLamViecFilter) {
    const data = await this.caLamViec_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.caLamViec_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() body: CreateCaLamViecDto) {
    const data = await this.caLamViec_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() body: UpdateCaLamViecDto) {
    const data = await this.caLamViec_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.caLamViec_Service.remove(id);
    return { success: true, message: 'Xóa ca làm việc thành công' };
  }
}
