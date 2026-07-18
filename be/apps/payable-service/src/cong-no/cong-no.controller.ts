import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import type { LoaiCongNo } from '@app/entities';
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CongNoService } from './cong-no.service';

@Controller()
@UseGuards(JwtGuard, RoleGuard)
export class CongNoController {
  constructor(private readonly congNoService: CongNoService) {}

  @Get('phai-thu')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiThu() {
    const data = await this.congNoService.findAll('PHAI_THU');
    return { success: true, data };
  }

  @Get('phai-thu/search')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async searchPhaiThu(@Query('keyword') keyword: string) {
    const data = await this.congNoService.search(keyword || '', 'PHAI_THU');
    return { success: true, data };
  }

  @Get('phai-thu/qua-han')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiThuQuaHan() {
    const data = await this.congNoService.getQuaHan('PHAI_THU');
    return { success: true, data };
  }

  @Get('phai-thu/aging-report')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiThuAgingReport() {
    const data = await this.congNoService.getAgingReport('PHAI_THU');
    return { success: true, data };
  }

  @Get('phai-thu/summary-by-customer')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiThuSummaryByCustomer() {
    const data = await this.congNoService.getSummaryByCounterparty('PHAI_THU');
    return { success: true, data };
  }

  @Get('phai-thu/grouped')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiThuGrouped() {
    const data = await this.congNoService.getPhaiThuGrouped();
    return { success: true, data };
  }

  @Get('phai-thu/stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiThuStats() {
    const data = await this.congNoService.getPhaiThuStats();
    return { success: true, data };
  }

  @Get('phai-tra')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiTra() {
    const data = await this.congNoService.findAll('PHAI_TRA');
    return { success: true, data };
  }

  @Get('phai-tra/search')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async searchPhaiTra(@Query('keyword') keyword: string) {
    const data = await this.congNoService.search(keyword || '', 'PHAI_TRA');
    return { success: true, data };
  }

  @Get('phai-tra/qua-han')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiTraQuaHan() {
    const data = await this.congNoService.getQuaHan('PHAI_TRA');
    return { success: true, data };
  }

  @Get('phai-tra/aging-report')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiTraAgingReport() {
    const data = await this.congNoService.getAgingReport('PHAI_TRA');
    return { success: true, data };
  }

  @Get('phai-tra/summary-by-supplier')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiTraSummaryBySupplier() {
    const data = await this.congNoService.getSummaryByCounterparty('PHAI_TRA');
    return { success: true, data };
  }

  @Get('phai-tra/grouped')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiTraGrouped() {
    const data = await this.congNoService.getPhaiTraGrouped();
    return { success: true, data };
  }

  @Get('phai-tra/stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getPhaiTraStats() {
    const data = await this.congNoService.getPhaiTraStats();
    return { success: true, data };
  }

  @Get('cong-no/series')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async getCongNoSeries(@Query('year') year?: string) {
    const y = Number(year) || new Date().getFullYear();
    const data = await this.congNoService.getCongNoSeries(y);
    return { success: true, data };
  }

  @Get('cong-no/:id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async findOne(@Param('id') id: string) {
    const data = await this.congNoService.findOne(id);
    return { success: true, data };
  }

  @Get('cong-no/doi-tuong/:doiTuongId')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async findByDoiTuong(
    @Param('doiTuongId') doiTuongId: string,
    @Query('loai') loai?: LoaiCongNo,
  ) {
    const data = await this.congNoService.findByDoiTuong(doiTuongId, loai);
    return { success: true, data };
  }

  @Put('cong-no/:id/payment')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_CONG_NO')
  async updatePayment(
    @Param('id') id: string,
    @Body('soTienTra') soTienTra: number,
  ) {
    const data = await this.congNoService.updatePayment(id, soTienTra);
    return { success: true, data };
  }
}
