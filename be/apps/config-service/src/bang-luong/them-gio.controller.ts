import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThemGio_Service } from './them-gio.service';
import { CapNhatDongThemGioDto, TongHopKyDto } from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Bảng thanh toán tiền làm thêm giờ (mẫu 03-LĐTL).
 *
 * Dùng lại quyền `/luong/bang-luong:*` chứ không mở module quyền mới: đây là
 * dữ liệu lương, cùng nhóm rủi ro với bảng lương chính, và thêm module quyền
 * là thêm một bước BẮT BUỘC `ops/grant-quyen-module-moi.ts` lúc deploy — quên
 * chạy là màn hình 403 với mọi người.
 *
 * Route có đoạn đường dẫn CỐ ĐỊNH (`tong-hop`, `chot`, `mo-lai`) phải khai
 * TRƯỚC route `:id` — nếu không NestJS khớp các chuỗi đó thành `:id`, cùng bẫy
 * đã ghi ở `bang-luong.controller.ts`.
 */
@Controller('bang-luong-them-gio')
@UseGuards(JwtGuard)
export class ThemGio_Controller {
  constructor(private readonly themGio_Service: ThemGio_Service) {}

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:xem')
  async danhSach(@Query('thang') thang: string) {
    const data = await this.themGio_Service.danhSach(thang);
    return { success: true, data };
  }

  @Post('tong-hop')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:them')
  async tongHop(@Body() body: TongHopKyDto) {
    const data = await this.themGio_Service.tongHop(body.thang);
    return { success: true, data };
  }

  @Post('chot')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:sua')
  async chot(@Body() body: TongHopKyDto) {
    const data = await this.themGio_Service.chot(body.thang);
    return { success: true, data };
  }

  @Post('mo-lai')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:sua')
  async moLai(@Body() body: TongHopKyDto) {
    const data = await this.themGio_Service.moLai(body.thang);
    return { success: true, data };
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:sua')
  async capNhatDong(
    @Param('id') id: string,
    @Body() body: CapNhatDongThemGioDto,
  ) {
    const data = await this.themGio_Service.capNhatDong(id, body);
    return { success: true, data };
  }
}
