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
import { DuAnService } from './du-an.service';
import { CreateDuAnDto, UpdateDuAnDto, DuAnQueryDto } from './dto';
import { DuAnStatus } from '@app/entities';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

@Controller('du-an')
@UseGuards(JwtGuard, RoleGuard)
export class DuAnController {
  constructor(private readonly duAnService: DuAnService) {}

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
  async findAll(@Query() query: DuAnQueryDto) {
    const result = await this.duAnService.findAllPaginated(query);
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
  async getAll(@Query('trangThai') trangThai?: DuAnStatus) {
    const data = await this.duAnService.findAll(trangThai);
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
    const data = await this.duAnService.search(keyword || '', limit || 20);
    return { success: true, data };
  }

  @Get('total')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getTotal(
    @Query('search') search?: string,
    @Query('trangThai') trangThai?: DuAnStatus,
  ) {
    const total = await this.duAnService.getTotal(search, trangThai);
    return { success: true, data: { total } };
  }

  @Get('check-ma')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async checkMa(
    @Query('ma') ma: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.duAnService.checkMaExists(ma, excludeId);
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
    const data = await this.duAnService.getStats();
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
    const data = await this.duAnService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async create(@Body() createDto: CreateDuAnDto) {
    const data = await this.duAnService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDuAnDto) {
    const data = await this.duAnService.update(id, updateDto);
    return { success: true, data };
  }

  @Put(':id/status')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async updateStatus(
    @Param('id') id: string,
    @Body('trangThai') trangThai: DuAnStatus,
  ) {
    const data = await this.duAnService.updateStatus(id, trangThai);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.duAnService.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.duAnService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
