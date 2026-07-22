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
import { AdminGuard, JwtGuard } from '@app/auth';

/**
 * Hồ sơ nhân viên neo mọi thứ của chấm công: `userId` (đường nối tài khoản
 * ↔ hồ sơ) và `workShiftId` (mốc tính muộn/sớm). Để hở thao tác GHI thì
 * nhân viên tự xoá `workShiftId` của mình là không bao giờ bị tính muộn,
 * còn xoá `userId` của đồng nghiệp là người đó mất hẳn đường chấm công.
 *
 * Dùng `AdminGuard` (kiểm `vaiTro`), KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true` nên mọi `@Roles` đều vô hiệu.
 *
 * `@Get` CỐ Ý chỉ giữ `JwtGuard` — xem chú thích ở từng route đọc.
 */
@Controller('nhan-vien')
@UseGuards(JwtGuard)
export class NhanVien_Controller {
  constructor(private readonly nhanVien_Service: NhanVien_Service) {}

  /**
   * CỐ Ý chỉ `JwtGuard`, KHÔNG `AdminGuard`: FE gọi endpoint này bằng token
   * thường để đổ ô chọn nhân viên ở 7 màn hình, trong đó có Bản ghi chấm
   * công (`fe/src/pages/cham-cong/ban-ghi/sub-handler/init/init.handler.ts`).
   * Bọc lại sẽ làm vỡ các màn hình đó.
   */
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
  @UseGuards(AdminGuard)
  async create(@Body() body: CreateEmployeeDto) {
    const data = await this.nhanVien_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() body: UpdateEmployeeDto) {
    const data = await this.nhanVien_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.nhanVien_Service.remove(id);
    return { success: true, message: 'Xóa nhân viên thành công' };
  }

  @Patch(':id/trang-thai')
  @UseGuards(AdminGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.nhanVien_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
