import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DiemDanhAnService } from './diem-danh-an.service';
import { CreateDiemDanhAnDto, UpdateDiemDanhAnDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

const READ = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER'];

@Controller('diem-danh-an')
@UseGuards(JwtGuard, RoleGuard)
export class DiemDanhAnController {
  constructor(private readonly service: DiemDanhAnService) {}

  @Get() @Roles(...READ)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all') @Roles(...READ)
  async getAll() { return { success: true, data: await this.service.findAll() }; }

  @Get('stats') @Roles(...READ)
  async getStats() { return { success: true, data: await this.service.getStats() }; }

  @Get(':id') @Roles(...READ)
  async findOne(@Param('id') id: string) { return { success: true, data: await this.service.findOne(id) }; }

  @Post() @Roles(...WRITE)
  async create(@Body() dto: CreateDiemDanhAnDto) { return { success: true, data: await this.service.create(dto) }; }

  @Put(':id') @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateDiemDanhAnDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Post('delete-batch') @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id') @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) { await this.service.delete(id); return { success: true, message: 'Xóa thành công' }; }
}
