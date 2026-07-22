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
import { NgayLe_Service } from './ngay-le.service';
import type { NgayLeFilter } from './ngay-le.service';
import { CreateNgayLeDto, UpdateNgayLeDto } from './dto';
import { AdminGuard, JwtGuard } from '@app/auth';

/**
 * Ngày lễ quyết định tiền công của CẢ công ty: `suyNgayNghi()` hỏi đúng
 * bảng này, và hễ trả `true` thì `tinhMuonSom()` trả `{0, 0}` cho mọi nhân
 * viên trong ngày đó. Một dòng ngày lễ giả xoá sạch đi muộn của toàn công
 * ty hôm ấy — và vì `laNgayNghi` được ghi thành SNAPSHOT trên từng bản ghi
 * chấm công, xoá ngày lễ giả đi cũng KHÔNG sửa lại được các bản ghi đã tạo
 * từ giao diện. Hàng rào vì thế phải chặn ngay ở lúc ghi.
 *
 * Dùng `AdminGuard` (kiểm `vaiTro`), KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true` nên mọi `@Roles` đều vô hiệu.
 *
 * `@Get` CỐ Ý chỉ giữ `JwtGuard`: lịch nghỉ là dữ liệu chung, không nhạy
 * cảm, và bọc GET sẽ làm vỡ các màn hình gọi bằng token thường.
 */
@Controller('ngay-le')
@UseGuards(JwtGuard)
export class NgayLe_Controller {
  constructor(private readonly ngayLe_Service: NgayLe_Service) {}

  @Get()
  async findAll(@Query() query: NgayLeFilter) {
    const data = await this.ngayLe_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.ngayLe_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() body: CreateNgayLeDto) {
    const data = await this.ngayLe_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() body: UpdateNgayLeDto) {
    const data = await this.ngayLe_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.ngayLe_Service.remove(id);
    return { success: true, message: 'Xóa ngày lễ thành công' };
  }
}
