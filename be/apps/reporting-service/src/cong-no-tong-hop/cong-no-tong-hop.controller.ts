import {
  Controller,
  Get,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { CongNoTongHopService } from './cong-no-tong-hop.service';

@Controller('bao-cao')
@UseGuards(JwtGuard, RoleGuard)
export class CongNoTongHopController {
  constructor(private readonly service: CongNoTongHopService) {}

  @Get('bang-tong-hop-cong-no')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('maTaiKhoan') maTaiKhoan?: string,
    @Query('maDoiTuong') maDoiTuong?: string,
    @Headers('authorization') authToken?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('startDate/endDate không hợp lệ');
    }
    const data = await this.service.getReport(
      start,
      end,
      { maTaiKhoan, maDoiTuong },
      authToken,
    );
    return { success: true, data };
  }
}
