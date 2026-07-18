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
  BadRequestException,
} from '@nestjs/common';
import { ChungTuService } from './chung-tu.service';
import { CreateChungTuDto, UpdateChungTuDto } from '../dto';
import type { LoaiChungTu } from '@app/entities';
import {
  JwtGuard,
  RoleGuard,
  Roles,
  CurrentUser,
  type UserPayload,
} from '@app/auth';
import { ChungTuQueryDto } from './dto/chung-tu-query.dto';
import { SUMMARY_TYPES, SummaryType } from '../nhat-ky-chung/dto';

/**
 * TODO: Các endpoint cần thêm lại sau khi refactor:
 *
 * 1. POST /chung-tu/:id/submit - Submit for approval
 * 2. POST /chung-tu/:id/approve - Approve voucher
 * 3. POST /chung-tu/:id/reject - Reject voucher
 * 4. GET /phieu-thu/stats - Phieu thu statistics
 * 5. GET /phieu-chi/stats - Phieu chi statistics
 * 6. GET /nhat-ky-chung - Get approved vouchers (journal entries)
 * 7. GET /nhat-ky-chung/stats - Journal entry statistics
 * 8. GET /nhat-ky-chung/summary-by-account
 * 9. GET /nhat-ky-chung/summary-by-team
 * 10. GET /nhat-ky-chung/summary-by-employee
 * 11. GET /nhat-ky-chung/summary-by-project
 * 12. GET /nhat-ky-chung/summary-by-chu-dau-tu
 * 13. GET /nhat-ky-chung/summary-by-san-pham
 * 14. GET /nhat-ky-chung/summary-by-dong-tien
 */

@Controller()
@UseGuards(JwtGuard, RoleGuard)
export class ChungTuController {
  constructor(private readonly chungTuService: ChungTuService) {}

  @Get('phieu-thu')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async findAllPhieuThu(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.findAllPaginated('PHIEU_THU', query);
  }

  @Get('phieu-thu/search')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async searchPhieuThu(@Query('keyword') keyword: string) {
    const data = await this.chungTuService.search(keyword || '', 'PHIEU_THU');
    return { success: true, data };
  }

  @Get('phieu-chi')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async findAllPhieuChi(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.findAllPaginated('PHIEU_CHI', query);
  }

  @Get('phieu-chi/search')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async searchPhieuChi(@Query('keyword') keyword: string) {
    const data = await this.chungTuService.search(keyword || '', 'PHIEU_CHI');
    return { success: true, data };
  }

  @Get('chung-tu')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async findAll(@Query('loai') loai?: LoaiChungTu) {
    const data = await this.chungTuService.findAll(loai);
    return { success: true, data };
  }

  @Get('phieu-thu/stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async statsPhieuThu(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.getStats('PHIEU_THU', query);
  }

  @Get('phieu-chi/stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async statsPhieuChi(@Query() query: ChungTuQueryDto) {
    return this.chungTuService.getStats('PHIEU_CHI', query);
  }

  @Get('phieu-thu/summary/:type')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async summaryPhieuThu(@Param('type') type: string, @Query() query: ChungTuQueryDto) {
    if (!SUMMARY_TYPES.includes(type as SummaryType)) {
      throw new BadRequestException(`Invalid summary type. Valid: ${SUMMARY_TYPES.join(', ')}`);
    }
    return this.chungTuService.getSummary('PHIEU_THU', type as SummaryType, query);
  }

  @Get('phieu-chi/summary/:type')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async summaryPhieuChi(@Param('type') type: string, @Query() query: ChungTuQueryDto) {
    if (!SUMMARY_TYPES.includes(type as SummaryType)) {
      throw new BadRequestException(`Invalid summary type. Valid: ${SUMMARY_TYPES.join(', ')}`);
    }
    return this.chungTuService.getSummary('PHIEU_CHI', type as SummaryType, query);
  }

  @Get('chung-tu/cash-flow-composition')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async cashFlowComposition(
    @Query('which') which: string,
    @Query() query: ChungTuQueryDto,
  ) {
    const w = which === 'chi' ? 'chi' : 'thu';
    return this.chungTuService.getCashFlowComposition(w, query);
  }

  @Get('chung-tu/cash-flow-series')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async cashFlowSeries(@Query('year') year?: string, @Query('month') month?: string) {
    const y = Number(year) || new Date().getFullYear();
    const m = month ? Number(month) : undefined;
    return this.chungTuService.getCashFlowSeries(y, m);
  }

  @Post('phieu-thu/import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async importPhieuThu(
    @Body() items: Omit<CreateChungTuDto, 'loai'>[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.chungTuService.importPhieu('PHIEU_THU', items, user.id);
  }

  @Post('phieu-chi/import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async importPhieuChi(
    @Body() items: Omit<CreateChungTuDto, 'loai'>[],
    @CurrentUser() user: UserPayload,
  ) {
    return this.chungTuService.importPhieu('PHIEU_CHI', items, user.id);
  }

  @Get('chung-tu/:id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT')
  async findOne(@Param('id') id: string) {
    const data = await this.chungTuService.findOne(id);
    return { success: true, data };
  }

  @Post('phieu-thu')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async createPhieuThu(
    @Body() createDto: Omit<CreateChungTuDto, 'loai'>,
    @CurrentUser() user: UserPayload,
  ) {
    const data = await this.chungTuService.create(
      { ...createDto, loai: 'PHIEU_THU' },
      user.id,
    );
    return { success: true, data };
  }

  @Post('phieu-chi')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async createPhieuChi(
    @Body() createDto: Omit<CreateChungTuDto, 'loai'>,
    @CurrentUser() user: UserPayload,
  ) {
    const data = await this.chungTuService.create(
      { ...createDto, loai: 'PHIEU_CHI' },
      user.id,
    );
    return { success: true, data };
  }

  @Put('chung-tu/:id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async update(@Param('id') id: string, @Body() updateDto: UpdateChungTuDto) {
    const data = await this.chungTuService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete('chung-tu/:id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async delete(@Param('id') id: string) {
    await this.chungTuService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
