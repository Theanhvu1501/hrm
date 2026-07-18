import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PhieuTemplate_Service } from './phieu-template.service';
import { JwtGuard, AdminGuard } from '@app/auth';
import { UpsertPhieuTemplateDto } from './dto';

@Controller('phieu-template')
@UseGuards(JwtGuard)
export class PhieuTemplate_Controller {
  constructor(private readonly service: PhieuTemplate_Service) {}

  // GET mở cho mọi user xem được trang: FE nạp mẫu đã lưu để IN mỗi lần vào trang.
  @Get(':loai')
  async findByLoai(@Param('loai') loai: string) {
    const data = await this.service.findByLoai(loai);
    return { success: true, data };
  }

  // Cấu hình mẫu in: chỉ admin tenant / super admin.
  @Put(':loai')
  @UseGuards(AdminGuard)
  async upsert(
    @Param('loai') loai: string,
    @Body() dto: UpsertPhieuTemplateDto,
  ) {
    const data = await this.service.upsert(loai, dto.html);
    return { success: true, data };
  }

  @Delete(':loai')
  @UseGuards(AdminGuard)
  async remove(@Param('loai') loai: string) {
    await this.service.remove(loai);
    return { success: true, message: 'Đã khôi phục mẫu mặc định' };
  }
}
