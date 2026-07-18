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
} from '@nestjs/common';
import { HoaDonBanRaService } from './hoa-don-ban-ra.service';
import { CreateHoaDonBanRaDto, UpdateHoaDonBanRaDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

const READ = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'KE_TOAN_CONG_NO', 'MANAGER', 'KIEM_SOAT'] as const;
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER'] as const;

@Controller('hoa-don-ban-ra')
@UseGuards(JwtGuard, RoleGuard)
export class HoaDonBanRaController {
  constructor(private readonly service: HoaDonBanRaService) {}

  @Get()
  @Roles(...READ)
  async list(
    @Query('hopDongId') hopDongId?: string,
    @Query('nam') nam?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.service.list({
      hopDongId,
      nam: nam ? Number(nam) : undefined,
      search,
    });
    return { success: true, data };
  }

  @Post()
  @Roles(...WRITE)
  async create(@Body() dto: CreateHoaDonBanRaDto) {
    const data = await this.service.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateHoaDonBanRaDto) {
    const data = await this.service.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(...WRITE)
  async remove(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true };
  }

  @Post('delete-batch')
  @Roles(...WRITE)
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
