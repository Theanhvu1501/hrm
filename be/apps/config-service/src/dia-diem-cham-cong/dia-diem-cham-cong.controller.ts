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
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * `doiChieuGps` chọn địa điểm GẦN NHẤT rồi so với `banKinh` của chính địa
 * điểm đó. Một địa điểm gps tự tạo ngay tại nhà nhân viên với `banKinh:
 * 5000` sẽ luôn là địa điểm gần nhất của người đó → `ngoaiVung: false` mọi
 * lúc, và toàn bộ tín hiệu đối chiếu vị trí mà HR dựa vào mất sạch. Nên mọi
 * thao tác GHI phải là quản trị.
 *
 * Hàng rào là `PermissionGuard` + `@Permissions('/cham-cong/dia-diem:...')`,
 * KHÔNG phải `AdminGuard`: `AdminGuard` chỉ cho qua khi `vaiTro` viết hoa lên
 * bằng `'ADMIN'`/`'SUPER_ADMIN'`, nhưng `vaiTro` do `JwtGuard` nạp từ
 * `app_user_roles.role` — là TÊN VAI TRÒ tự do từng tenant tự đặt ("Quản trị
 * hệ thống", "Quản lý"...). Trên production không ai có đúng chuỗi "ADMIN"
 * nên AdminGuard chặn cả HR thật, mọi thao tác ghi địa điểm trả 403.
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
 *
 * `@Get` CÓ gắn `:xem` — đúng key `fe/src/config/routePermissions.ts` dùng để
 * gate màn hình Địa điểm chấm công, nên ai mở được màn hình thì gọi được API.
 */
@Controller('dia-diem-cham-cong')
@UseGuards(JwtGuard)
export class DiaDiemChamCong_Controller {
  constructor(
    private readonly diaDiemChamCong_Service: DiaDiemChamCong_Service,
  ) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/dia-diem:xem')
  async findAll(@Query() query: DiaDiemChamCongFilter) {
    const data = await this.diaDiemChamCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/dia-diem:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.diaDiemChamCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/dia-diem:them')
  async create(@Body() body: CreateDiaDiemChamCongDto) {
    const data = await this.diaDiemChamCong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/dia-diem:sua')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDiaDiemChamCongDto,
  ) {
    const data = await this.diaDiemChamCong_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/dia-diem:xoa')
  async remove(@Param('id') id: string) {
    await this.diaDiemChamCong_Service.remove(id);
    return { success: true, message: 'Xóa địa điểm chấm công thành công' };
  }
}
