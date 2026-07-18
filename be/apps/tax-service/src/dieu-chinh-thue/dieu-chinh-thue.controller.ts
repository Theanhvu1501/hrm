import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { DieuChinhThueService } from './dieu-chinh-thue.service';
import { UpdateDieuChinhThueDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

const KE_TOAN_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'MANAGER',
  'KIEM_SOAT',
];

@Controller('dieu-chinh-thue')
@UseGuards(JwtGuard, RoleGuard)
export class DieuChinhThueController {
  constructor(private readonly service: DieuChinhThueService) {}

  @Get()
  @Roles(...KE_TOAN_ROLES)
  async get(@Query('nam', ParseIntPipe) nam: number) {
    const data = await this.service.getOrDefault(nam);
    return { success: true, data };
  }

  @Put()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY')
  async upsert(
    @Query('nam', ParseIntPipe) nam: number,
    @Body() dto: UpdateDieuChinhThueDto,
  ) {
    const data = await this.service.upsert(nam, dto);
    return { success: true, data };
  }
}
