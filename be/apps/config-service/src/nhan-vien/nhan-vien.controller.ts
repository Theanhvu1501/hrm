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
  Req,
  UseGuards,
} from '@nestjs/common';
import { NhanVien_Service } from './nhan-vien.service';
import type { EmployeeFilter } from './nhan-vien.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('nhan-vien')
@UseGuards(JwtGuard)
export class NhanVien_Controller {
  constructor(private readonly nhanVien_Service: NhanVien_Service) {}

  @Get()
  async findAll(@Query() query: EmployeeFilter) {
    const data = await this.nhanVien_Service.findAll(query);
    return { success: true, data };
  }

  /**
   * Hồ sơ NV của chính người đang đăng nhập. Chỉ JwtGuard, KHÔNG
   * PermissionGuard — mọi nhân viên đều phải xem được hồ sơ của mình.
   * Controller này hiện chỉ gắn JwtGuard ở cấp class (không có
   * PermissionGuard) nên không cần miễn trừ gì thêm — nhưng nếu sau này
   * ai đó thêm PermissionGuard ở cấp class, ĐỪNG áp nó lên route `me`.
   * Phải đặt route này TRƯỚC `@Get(':id')` — nếu đặt sau, Nest sẽ khớp
   * "me" thành tham số :id.
   */
  @Get('me')
  async me(@Req() req: any) {
    const data = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.nhanVien_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateEmployeeDto) {
    const data = await this.nhanVien_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateEmployeeDto) {
    const data = await this.nhanVien_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.nhanVien_Service.remove(id);
    return { success: true, message: 'Xóa nhân viên thành công' };
  }

  @Patch(':id/trang-thai')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.nhanVien_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
