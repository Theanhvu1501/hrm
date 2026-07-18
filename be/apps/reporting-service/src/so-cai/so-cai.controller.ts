import { Controller, Get, Query, UseGuards, Headers } from '@nestjs/common';
import { SoCaiService } from './so-cai.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('so-cai')
@UseGuards(JwtGuard, RoleGuard)
export class SoCaiController {
  constructor(private readonly soCaiService: SoCaiService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getLedger(
    @Query('maTaiKhoan') maTaiKhoan: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken: string,
  ) {
    const data = await this.soCaiService.getLedger(
      maTaiKhoan,
      new Date(startDate),
      new Date(endDate),
      authToken,
    );
    return { success: true, data };
  }

  @Get('all')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getAll(@Headers('authorization') authToken: string) {
    const data = await this.soCaiService.getAll(authToken);
    return { success: true, data };
  }

  @Get('summary-by-account')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getSummaryByAccount(@Headers('authorization') authToken: string) {
    const data = await this.soCaiService.getSummaryByAccount(authToken);
    return { success: true, data };
  }

  @Get('stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getStats(@Headers('authorization') authToken: string) {
    const data = await this.soCaiService.getStats(authToken);
    return { success: true, data };
  }

  @Get('trial-balance')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getTrialBalance(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Headers('authorization') authToken: string,
  ) {
    // Default to current year if dates not provided
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : now;

    const data = await this.soCaiService.getTrialBalance(start, end, authToken);
    return { success: true, data };
  }
}
