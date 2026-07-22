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
import { DiaDiemChamCong_Service } from './dia-diem-cham-cong.service';
import type { DiaDiemChamCongFilter } from './dia-diem-cham-cong.service';
import { CreateDiaDiemChamCongDto, UpdateDiaDiemChamCongDto } from './dto';
import { AdminGuard, JwtGuard } from '@app/auth';

/**
 * `doiChieuGps` chọn địa điểm GẦN NHẤT rồi so với `banKinh` của chính địa
 * điểm đó. Một địa điểm gps tự tạo ngay tại nhà nhân viên với `banKinh:
 * 5000` sẽ luôn là địa điểm gần nhất của người đó → `ngoaiVung: false` mọi
 * lúc, và toàn bộ tín hiệu đối chiếu vị trí mà HR dựa vào mất sạch. Nên mọi
 * thao tác GHI phải là quản trị.
 *
 * Dùng `AdminGuard` (kiểm `vaiTro`), KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true` nên mọi `@Roles` đều vô hiệu.
 *
 * `@Get` CỐ Ý chỉ giữ `JwtGuard` để các màn hình gọi bằng token thường
 * không bị vỡ.
 */
@Controller('dia-diem-cham-cong')
@UseGuards(JwtGuard)
export class DiaDiemChamCong_Controller {
  constructor(
    private readonly diaDiemChamCong_Service: DiaDiemChamCong_Service,
  ) {}

  @Get()
  async findAll(@Query() query: DiaDiemChamCongFilter) {
    const data = await this.diaDiemChamCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.diaDiemChamCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() body: CreateDiaDiemChamCongDto) {
    const data = await this.diaDiemChamCong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDiaDiemChamCongDto,
  ) {
    const data = await this.diaDiemChamCong_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.diaDiemChamCong_Service.remove(id);
    return { success: true, message: 'Xóa địa điểm chấm công thành công' };
  }
}
