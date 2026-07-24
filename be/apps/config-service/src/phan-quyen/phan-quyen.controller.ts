import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PhanQuyen_Service } from './phan-quyen.service';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { UpsertPermissionsDto } from './upsert-permissions.dto';
import { CreatePhanQuyenDto } from './create-phan-quyen.dto';
import { UpdatePhanQuyenDto } from './update-phan-quyen.dto';

/**
 * Controller này từng chỉ có `@UseGuards(JwtGuard)` — không route ghi nào đòi
 * quyền. Chừng nào `PermissionGuard` chưa được dùng ở đâu thì ghi đè
 * `phan_quyen` chỉ đổi menu FE, vô hại ở BE. Từ commit 67979dd, bảng này là
 * NGUỒN THẨM QUYỀN THẬT của các controller chấm công/nhân sự — tức trục tin
 * cậy đã dời sang một bảng mà bất kỳ ai đăng nhập cũng ghi được:
 *
 *   1. `GET /config/phan-quyen` để biết `vaiTro` của mình;
 *   2. `PUT /config/phan-quyen/:id` với `{"permissions":["*"]}` —
 *      `PermissionGuard` coi `'*'` là toàn quyền;
 *   3. sau ≤30s (TTL cache `AuthzLoaderService`) là toàn quyền hồ sơ nhân
 *      viên, ca, ngày lễ, địa điểm, thiết bị, đơn từ, bản ghi chấm công của
 *      cả công ty.
 *
 * Gateway là proxy thuần (`apps/gateway/src/environments/environment.ts`),
 * không có hàng rào nào chặn trước. Nên hàng rào phải nằm ở đây.
 *
 * Hai lớp, thiếu lớp nào cũng hỏng:
 *  - `PermissionGuard` + `@Permissions('/cau-hinh/phan-quyen:...')` trên MỌI
 *    route — quyết định AI được chạm vào bảng;
 *  - DTO thật (không `any`) trên mọi body — quyết định GHI ĐƯỢC GÌ, vì
 *    `ValidationPipe` toàn cục chỉ chạy khi tham số có metatype thật.
 *
 * Lưu ý CỐ Ý không xử lý ở đây: người ĐÃ có `/cau-hinh/phan-quyen:sua` vẫn tự
 * nâng quyền cho mình được. Đó là bản chất của màn hình phân quyền; thứ phải
 * chặn là người KHÔNG có quyền đó.
 *
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
 */
@Controller('phan-quyen')
@UseGuards(JwtGuard)
export class PhanQuyen_Controller {
  constructor(private readonly phanQuyen_Service: PhanQuyen_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:xem')
  async findAll() {
    const data = await this.phanQuyen_Service.findAll();
    return { success: true, data };
  }

  @Get('vai-tro/:vaiTro/permissions')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:xem')
  async getPermissions(@Param('vaiTro') vaiTro: string) {
    const data = await this.phanQuyen_Service.getPermissionsByVaiTro(vaiTro);
    return { success: true, data };
  }

  @Get('vai-tro/:vaiTro')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:xem')
  async findByVaiTro(@Param('vaiTro') vaiTro: string) {
    const data = await this.phanQuyen_Service.findByVaiTro(vaiTro);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.phanQuyen_Service.findOne(id);
    return { success: true, data };
  }

  @Put('vai-tro/:vaiTro/permissions')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:sua')
  async upsertPermissions(
    @Param('vaiTro') vaiTro: string,
    @Body() body: UpsertPermissionsDto,
  ) {
    const data = await this.phanQuyen_Service.upsertPermissions(
      vaiTro,
      body.permissions,
    );
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:them')
  async create(@Body() createDto: CreatePhanQuyenDto) {
    const data = await this.phanQuyen_Service.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:sua')
  async update(@Param('id') id: string, @Body() updateDto: UpdatePhanQuyenDto) {
    const data = await this.phanQuyen_Service.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cau-hinh/phan-quyen:xoa')
  async delete(@Param('id') id: string) {
    await this.phanQuyen_Service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
