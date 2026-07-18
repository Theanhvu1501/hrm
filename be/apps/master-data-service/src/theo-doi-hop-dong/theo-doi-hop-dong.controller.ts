import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TheoDoiHopDongService } from './theo-doi-hop-dong.service';
import { UpsertTheoDoiHopDongDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

const READ_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'MANAGER',
  'KIEM_SOAT',
] as const;

const WRITE_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
] as const;

@Controller('theo-doi-hop-dong')
@UseGuards(JwtGuard, RoleGuard)
export class TheoDoiHopDongController {
  constructor(private readonly service: TheoDoiHopDongService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(
    @Query('nam') nam?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.service.list({
      nam: nam ? Number(nam) : undefined,
      search,
    });
    return { success: true, data };
  }

  @Get('stats')
  @Roles(...READ_ROLES)
  async stats() {
    const data = await this.service.getStats();
    return { success: true, data };
  }

  @Get('bao-cao')
  @Roles(...READ_ROLES)
  async baoCao() {
    const data = await this.service.baoCao();
    return { success: true, data };
  }

  @Get(':hopDongId')
  @Roles(...READ_ROLES)
  async getByHopDongId(@Param('hopDongId') hopDongId: string) {
    const data = await this.service.getByHopDongId(hopDongId);
    return { success: true, data };
  }

  @Put(':hopDongId')
  @Roles(...WRITE_ROLES)
  async upsert(
    @Param('hopDongId') hopDongId: string,
    @Body() dto: UpsertTheoDoiHopDongDto,
  ) {
    const data = await this.service.upsert(hopDongId, dto);
    return { success: true, data };
  }
}
