import { Controller, Get, Query, UseGuards, Headers } from '@nestjs/common';
import { SoChiTietService } from './so-chi-tiet.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('so-chi-tiet-tai-khoan')
@UseGuards(JwtGuard, RoleGuard)
export class SoChiTietController {
  constructor(private readonly soChiTietService: SoChiTietService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getSoChiTiet(
    @Query('maTaiKhoan') maTaiKhoan: string,
    @Query('maDoiTuong') maDoiTuong: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken: string,
  ) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : now;

    const data = await this.soChiTietService.getSoChiTiet(
      maTaiKhoan,
      maDoiTuong || undefined,
      start,
      end,
      authToken,
    );
    return { success: true, data };
  }
}
