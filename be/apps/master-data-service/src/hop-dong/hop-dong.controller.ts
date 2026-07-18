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
import { HopDongService } from './hop-dong.service';
import { CreateHopDongDto, UpdateHopDongDto, HopDongQueryDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

@Controller('hop-dong')
@UseGuards(JwtGuard, RoleGuard)
export class HopDongController {
  constructor(private readonly hopDongService: HopDongService) {}

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
  async findAll(@Query() query: HopDongQueryDto) {
    const result = await this.hopDongService.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
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
    const data = await this.hopDongService.findAll();
    return { success: true, data };
  }

  @Get('search')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async search(
    @Query('keyword') keyword: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.hopDongService.search(keyword || '', limit || 20);
    return { success: true, data };
  }

  @Get('check-so-hop-dong')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async checkSoHopDong(
    @Query('soHopDong') soHopDong: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.hopDongService.checkSoHopDongExists(
      soHopDong,
      excludeId,
    );
    return { success: true, data: { exists } };
  }

  @Get('stats')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getStats() {
    const data = await this.hopDongService.getStats();
    return { success: true, data };
  }

  @Get(':id')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findOne(@Param('id') id: string) {
    const data = await this.hopDongService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async create(@Body() createDto: CreateHopDongDto) {
    const data = await this.hopDongService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async update(@Param('id') id: string, @Body() updateDto: UpdateHopDongDto) {
    const data = await this.hopDongService.update(id, updateDto);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.hopDongService.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.hopDongService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
