import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThietBiChamCong_Service } from './thiet-bi-cham-cong.service';
import type { ThietBiFilter } from './thiet-bi-cham-cong.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { JwtGuard } from '@app/auth';

@Controller('thiet-bi-cham-cong')
@UseGuards(JwtGuard)
export class ThietBiChamCong_Controller {
  constructor(
    private readonly thietBi_Service: ThietBiChamCong_Service,
    private readonly nhanVien_Service: NhanVien_Service,
  ) {}

  /**
   * Tự phục vụ — chỉ JwtGuard, CỐ Ý không gắn kiểm tra quyền: mọi nhân
   * viên (không riêng gì HR) đều phải xem được danh sách thiết bị của
   * chính mình để biết máy đang chờ duyệt hay đã được duyệt.
   *
   * Phải đặt TRƯỚC các route có tham số (":id"), nếu không NestJS sẽ
   * khớp "cua-toi" thành :id.
   */
  @Get('cua-toi')
  async cuaToi(@Req() req: any) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    const data = await this.thietBi_Service.cuaToi(emp);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: ThietBiFilter) {
    const data = await this.thietBi_Service.findAll(query);
    return { success: true, data };
  }

  @Post(':id/duyet')
  async duyet(@Param('id') id: string, @Req() req: any) {
    const data = await this.thietBi_Service.duyet(id, req.user?.email ?? '');
    return { success: true, data };
  }

  @Post(':id/tu-choi')
  async tuChoi(@Param('id') id: string, @Req() req: any) {
    const data = await this.thietBi_Service.tuChoi(id, req.user?.email ?? '');
    return { success: true, data };
  }

  @Post(':id/thu-hoi')
  async thuHoi(
    @Param('id') id: string,
    @Body() body: { lyDo?: string },
    @Req() req: any,
  ) {
    const data = await this.thietBi_Service.thuHoi(
      id,
      req.user?.email ?? '',
      body?.lyDo,
    );
    return { success: true, data };
  }
}
