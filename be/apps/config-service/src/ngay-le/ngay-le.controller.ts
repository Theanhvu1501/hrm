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
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Ngày lễ quyết định tiền công của CẢ công ty: `suyNgayNghi()` hỏi đúng
 * bảng này, và hễ trả `true` thì `tinhMuonSom()` trả `{0, 0}` cho mọi nhân
 * viên trong ngày đó. Một dòng ngày lễ giả xoá sạch đi muộn của toàn công
 * ty hôm ấy — và vì `laNgayNghi` được ghi thành SNAPSHOT trên từng bản ghi
 * chấm công, xoá ngày lễ giả đi cũng KHÔNG sửa lại được các bản ghi đã tạo
 * từ giao diện. Hàng rào vì thế phải chặn ngay ở lúc ghi.
 *
 * Hàng rào là `PermissionGuard` + `@Permissions('/cham-cong/ngay-le:...')`,
 * KHÔNG phải `AdminGuard`: `AdminGuard` chỉ cho qua khi `vaiTro` viết hoa lên
 * bằng `'ADMIN'`/`'SUPER_ADMIN'`, nhưng `vaiTro` do `JwtGuard` nạp từ
 * `app_user_roles.role` — là TÊN VAI TRÒ tự do từng tenant tự đặt ("Quản trị
 * hệ thống", "Quản lý", "HR Admin"...). Trên production không ai có đúng
 * chuỗi "ADMIN", nên AdminGuard chặn cả HR thật: mọi thao tác ghi ngày lễ trả
 * 403. Thêm vài chuỗi vào danh sách trắng chỉ là vá tạm, tenant sau đặt tên
 * khác lại vỡ. `phan_quyen.permissions` mới là cơ chế đúng và đã có sẵn dữ
 * liệu khớp chính xác key FE dùng để gate màn hình.
 *
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
 *
 * `@Get` CÓ gắn `:xem` (khác tiền lệ AdminGuard trước đây): đó chính là key
 * `fe/src/config/routePermissions.ts` dùng để gate màn hình Ngày lễ, nên ai
 * mở được màn hình thì cũng gọi được API.
 */
@Controller('ngay-le')
@UseGuards(JwtGuard)
export class NgayLe_Controller {
  constructor(private readonly ngayLe_Service: NgayLe_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ngay-le:xem')
  async findAll(@Query() query: NgayLeFilter) {
    const data = await this.ngayLe_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ngay-le:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.ngayLe_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ngay-le:them')
  async create(@Body() body: CreateNgayLeDto) {
    const data = await this.ngayLe_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ngay-le:sua')
  async update(@Param('id') id: string, @Body() body: UpdateNgayLeDto) {
    const data = await this.ngayLe_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ngay-le:xoa')
  async remove(@Param('id') id: string) {
    await this.ngayLe_Service.remove(id);
    return { success: true, message: 'Xóa ngày lễ thành công' };
  }
}
