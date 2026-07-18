import { Controller, Get, Query, UseGuards, Headers } from '@nestjs/common';
import { SoQuyService } from './so-quy.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('so-quy')
@UseGuards(JwtGuard, RoleGuard)
export class SoQuyController {
  constructor(private readonly soQuyService: SoQuyService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getSoQuy(@Headers('authorization') authToken: string) {
    const data = await this.soQuyService.getSoQuy(authToken);
    return { success: true, data };
  }

  @Get('by-date-range')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.soQuyService.getByDateRange(
      new Date(startDate),
      new Date(endDate),
      authToken,
    );
    return { success: true, data };
  }

  @Get('by-month')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getByMonth(
    @Query('month') month: string,
    @Query('year') year: string,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.soQuyService.getByMonth(
      parseInt(month, 10),
      parseInt(year, 10),
      authToken,
    );
    return { success: true, data };
  }

  @Get('stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getStats(@Headers('authorization') authToken: string) {
    const data = await this.soQuyService.getStats(authToken);
    return { success: true, data };
  }

  @Get('search')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async search(
    @Query('keyword') keyword: string,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.soQuyService.search(keyword || '', authToken);
    return { success: true, data };
  }

  @Get('daily-summary')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getDailySummary(@Headers('authorization') authToken: string) {
    const data = await this.soQuyService.getDailySummary(authToken);
    return { success: true, data };
  }
}
