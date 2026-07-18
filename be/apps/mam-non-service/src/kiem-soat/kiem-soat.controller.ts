import { Controller, Get, Post, Query, UseGuards, Headers } from '@nestjs/common';
import { KiemSoatService } from './kiem-soat.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('kiem-soat')
@UseGuards(JwtGuard, RoleGuard)
export class KiemSoatController {
  constructor(private readonly service: KiemSoatService) {}

  @Get('chi-phi')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async chiPhi(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Query('nguongPct') nguongPct?: string,
    @Headers('authorization') authToken?: string,
  ) {
    const data = await this.service.chiPhi(tuNgay, denNgay, nguongPct ? Number(nguongPct) : 0, authToken);
    return { success: true, data };
  }

  @Post('chot-tieu-hao')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async chotTieuHao(
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
    @Headers('authorization') authToken?: string,
  ) {
    return { success: true, data: await this.service.chotTieuHao(tuNgay, denNgay, authToken) };
  }
}
