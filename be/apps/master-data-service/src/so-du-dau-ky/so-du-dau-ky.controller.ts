import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SoDuDauKyService } from './so-du-dau-ky.service';
import { SaveSoDuDauKyDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('so-du-dau-ky')
@UseGuards(JwtGuard, RoleGuard)
export class SoDuDauKyController {
  constructor(private readonly service: SoDuDauKyService) {}

  @Get()
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getAll() {
    const data = await this.service.getAll();
    return { success: true, data };
  }

  @Put()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async saveBulk(@Body() dto: SaveSoDuDauKyDto) {
    const data = await this.service.saveBulk(dto);
    return { success: true, data };
  }
}
