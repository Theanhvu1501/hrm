import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NguoiDung_Service } from './nguoi-dung.service';
import {
  CreateNguoiDungDto,
  UpdateNguoiDungDto,
  PaginationQueryDto,
  AddExistingUserDto,
} from './dto';
import { JwtGuard, PermissionGuard, Permissions, AuthToken } from '@app/auth';

/**
 * Controller thành viên thao tác trên tài khoản đăng nhập của cả tenant
 * (thêm/xoá người, khoá tài khoản, đổi vai trò) — mà vai trò lại là thứ
 * `phan_quyen` gắn quyền vào. Trước bản vá này nó khai
 * `@UseGuards(JwtGuard, RoleGuard)` + `@Roles('ADMIN')` trên từng route, TRÔNG
 * như đã bảo vệ, nhưng `libs/auth/src/guards/role.guard.ts` `canActivate()`
 * chỉ `return true` — mọi tài khoản đăng nhập đều qua.
 *
 * `RoleGuard`/`@Roles` bị gỡ hẳn thay vì để lại: một hàng rào không làm gì mà
 * vẫn hiện trong diff là thứ khiến lần rà soát sau bỏ qua file này. Thay bằng
 * `PermissionGuard` + `@Permissions('/cau-hinh/thanh-vien:...')` — cùng khuôn
 * với các module đã siết ở 67979dd, và đúng key `fe/src/config/routePermissions.ts`
 * dùng để gate màn hình Thành viên.
 *
 * Không route nào ở đây là tự phục vụ (`/auth/me` của auth-service mới là
 * đường "xem chính mình", không phải controller này).
 */
@Controller('nguoi-dung')
@UseGuards(JwtGuard)
export class NguoiDung_Controller {
  constructor(private readonly nguoiDungService: NguoiDung_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:xem')
  async findAll(@AuthToken() token: string, @Query() query: PaginationQueryDto) {
    const result = await this.nguoiDungService.findAll(token, query);
    return { success: true, ...result };
  }

  @Get('stats')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:xem')
  async getStats(@AuthToken() token: string) {
    const data = await this.nguoiDungService.getStats(token);
    return { success: true, data };
  }

  @Get('available-users')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:xem')
  async getAvailableUsers(
    @AuthToken() token: string,
    @Query('search') search?: string,
  ) {
    const data = await this.nguoiDungService.searchUsersNotInTenant(token, search);
    return { success: true, data };
  }

  @Post('add-existing')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:them')
  async addExistingUser(@AuthToken() token: string, @Body() dto: AddExistingUserDto) {
    const data = await this.nguoiDungService.addExistingUser(token, dto);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:xem')
  async findOne(@AuthToken() token: string, @Param('id') id: string) {
    const data = await this.nguoiDungService.findOne(token, id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:them')
  async create(@AuthToken() token: string, @Body() dto: CreateNguoiDungDto) {
    const data = await this.nguoiDungService.create(token, dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:sua')
  async update(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Body() dto: UpdateNguoiDungDto,
  ) {
    const data = await this.nguoiDungService.update(token, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:xoa')
  async delete(@AuthToken() token: string, @Param('id') id: string) {
    await this.nguoiDungService.delete(token, id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Patch(':id/toggle-status')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/thanh-vien:sua')
  async toggleStatus(@AuthToken() token: string, @Param('id') id: string) {
    const data = await this.nguoiDungService.toggleStatus(token, id);
    return { success: true, data };
  }
}
