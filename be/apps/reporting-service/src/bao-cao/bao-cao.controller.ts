import { Controller, Get, Query, UseGuards, Headers, BadRequestException } from '@nestjs/common';
import { BaoCaoService } from './bao-cao.service';
import { JwtGuard, RoleGuard, Roles, CurrentUser, type UserPayload } from '@app/auth';

@Controller('bao-cao')
@UseGuards(JwtGuard, RoleGuard)
export class BaoCaoController {
  constructor(private readonly baoCaoService: BaoCaoService) {}

  @Get('pnl')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPnL(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('periodType') periodType: string = 'thang',
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const validPeriodTypes = ['ngay', 'thang', 'quy', 'nam', 'tuyChon'];
    if (!validPeriodTypes.includes(periodType)) {
      throw new BadRequestException(
        `periodType phải là một trong: ${validPeriodTypes.join(', ')}`,
      );
    }

    const data = await this.baoCaoService.getPnL(
      new Date(startDate),
      new Date(endDate),
      periodType as 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
      authToken,
      user.tenantId,
    );
    return { success: true, data };
  }

  @Get('pnl-series')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPnlSeries(
    @Query('year') year: string,
    @Query('month') month: string,
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = month ? parseInt(month, 10) : undefined;
    const data = await this.baoCaoService.getPnlSeries(
      y,
      authToken,
      user.tenantId,
      m,
    );
    return { success: true, data };
  }

  @Get('loi-nhuan-theo')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getLoiNhuanByDimension(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('dimension') dimension: string,
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const data = await this.baoCaoService.getLoiNhuanByDimension(
      new Date(startDate),
      new Date(endDate),
      dimension || 'doi-tuong',
      authToken,
      user.tenantId,
    );
    return { success: true, data };
  }

  @Get('cong-no-series')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getCongNoSeries(
    @Query('year') year: string,
    @Query('month') month: string,
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const y = parseInt(year, 10) || new Date().getFullYear();
    const m = month ? parseInt(month, 10) : undefined;
    const data = await this.baoCaoService.getCongNoSeries(
      y,
      authToken,
      user.tenantId,
      m,
    );
    return { success: true, data };
  }

  @Get('balance-sheet')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getBalanceSheet(
    @Query('asOfDate') asOfDate: string,
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const date = new Date(asOfDate || new Date().toISOString());
    if (isNaN(date.getTime())) {
      throw new BadRequestException('asOfDate không hợp lệ');
    }
    const data = await this.baoCaoService.getBalanceSheet(
      date,
      authToken,
      user.tenantId,
    );
    return { success: true, data };
  }

  @Get('kqkd')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getKqkd(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('periodType') periodType: string = 'thang',
    @Headers('authorization') authToken: string,
    @CurrentUser() user: UserPayload,
  ) {
    const validPeriodTypes = ['ngay', 'thang', 'quy', 'nam', 'tuyChon'];
    if (!validPeriodTypes.includes(periodType)) {
      throw new BadRequestException(
        `periodType phải là một trong: ${validPeriodTypes.join(', ')}`,
      );
    }

    const data = await this.baoCaoService.getKqkd(
      new Date(startDate),
      new Date(endDate),
      periodType as 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
      authToken,
      user.tenantId,
    );
    return { success: true, data };
  }
}
