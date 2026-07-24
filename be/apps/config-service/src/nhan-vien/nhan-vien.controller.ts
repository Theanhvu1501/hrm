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
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Hồ sơ nhân viên neo mọi thứ của chấm công: `userId` (đường nối tài khoản
 * ↔ hồ sơ) và `workShiftId` (mốc tính muộn/sớm). Để hở thao tác GHI thì
 * nhân viên tự xoá `workShiftId` của mình là không bao giờ bị tính muộn,
 * còn xoá `userId` của đồng nghiệp là người đó mất hẳn đường chấm công.
 *
 * Hàng rào là `PermissionGuard` +
 * `@Permissions('/nhan-su/ho-so-nhan-vien:...')`, KHÔNG phải `AdminGuard`:
 * `AdminGuard` chỉ cho qua khi `vaiTro` viết hoa lên bằng
 * `'ADMIN'`/`'SUPER_ADMIN'`, nhưng `vaiTro` do `JwtGuard` nạp từ
 * `app_user_roles.role` — là TÊN VAI TRÒ tự do từng tenant tự đặt ("Quản trị
 * hệ thống", "Quản lý"...). Trên production không ai có đúng chuỗi "ADMIN"
 * nên AdminGuard chặn cả HR thật: không tạo/sửa/xoá được nhân viên nào.
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
 *
 * `@Get` CÓ gắn `:xem` — đúng key `fe/src/config/routePermissions.ts` dùng để
 * gate màn hình Hồ sơ nhân viên. Ngoại lệ DUY NHẤT là `GET /me` (tự phục vụ),
 * xem chú thích tại route đó.
 */
@Controller('nhan-vien')
@UseGuards(JwtGuard)
export class NhanVien_Controller {
  constructor(private readonly nhanVien_Service: NhanVien_Service) {}

  /**
   * FE gọi endpoint này để đổ ô chọn nhân viên ở 7 màn hình, trong đó có Bản
   * ghi chấm công
   * (`fe/src/pages/cham-cong/ban-ghi/sub-handler/init/init.handler.ts`). Nên
   * vai trò mở được các màn hình đó BẮT BUỘC phải có `/nhan-su/ho-so-nhan-vien:xem`
   * — đây là quyền FE cũng dùng để gate chính màn Hồ sơ nhân viên.
   */
  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xem')
  async findAll(@Query() query: EmployeeFilter) {
    const data = await this.nhanVien_Service.findAll(query);
    return { success: true, data };
  }

  /**
   * TỰ PHỤC VỤ: hồ sơ NV của chính người đang đăng nhập. CHỈ `JwtGuard`,
   * KHÔNG `PermissionGuard`/`@Permissions` — mọi nhân viên đều phải xem được
   * hồ sơ của mình, kể cả người mới chưa được HR gán vai trò nào. Phạm vi dữ
   * liệu đã khoá bằng `resolveEmployeeFromUser(req.user)`. `PermissionGuard`
   * chỉ được gắn ở CẤP ROUTE trong controller này (không phải cấp class) đúng
   * để route `me` không dính phải nó.
   * Phải đặt route này TRƯỚC `@Get(':id')` — nếu đặt sau, Nest sẽ khớp
   * "me" thành tham số :id.
   */
  @Get('me')
  async me(@Req() req: any) {
    const data = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.nhanVien_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:them')
  async create(@Body() body: CreateEmployeeDto) {
    const data = await this.nhanVien_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:sua')
  async update(@Param('id') id: string, @Body() body: UpdateEmployeeDto) {
    const data = await this.nhanVien_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xoa')
  async remove(@Param('id') id: string) {
    await this.nhanVien_Service.remove(id);
    return { success: true, message: 'Xóa nhân viên thành công' };
  }

  // `@Patch :id/trang-thai` xếp cùng nhóm với `@Delete` (quyền `:xoa`) chứ
  // không phải `:sua`: đổi trạng thái hồ sơ là ngưng hoạt động / khôi phục —
  // hệ quả ngang xoá mềm (nhân viên bị ngưng thì mất đường chấm công), không
  // phải sửa thông tin hồ sơ.
  @Patch(':id/trang-thai')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xoa')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.nhanVien_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
