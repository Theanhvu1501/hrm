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
import { DinhMucTienAnService } from './dinh-muc-tien-an.service';
import { CreateDinhMucTienAnDto, UpdateDinhMucTienAnDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

const READ = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'MANAGER',
  'KIEM_SOAT',
];
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP'];

@Controller('dinh-muc-tien-an')
@UseGuards(JwtGuard, RoleGuard)
export class DinhMucTienAnController {
  constructor(private readonly service: DinhMucTienAnService) {}

  @Get()
  @Roles(...READ)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
  @Roles(...READ)
  async getAll() {
    return { success: true, data: await this.service.findAll() };
  }

  @Get('stats')
  @Roles(...READ)
  async getStats() {
    return { success: true, data: await this.service.getStats() };
  }

  @Get('check-code')
  @Roles(...READ)
  async checkCode(
    @Query('code') code: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return {
      success: true,
      data: { exists: await this.service.checkCodeExists(code, excludeId) },
    };
  }

  @Get(':id')
  @Roles(...READ)
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.service.findOne(id) };
  }

  @Post()
  @Roles(...WRITE)
  async create(@Body() dto: CreateDinhMucTienAnDto) {
    return { success: true, data: await this.service.create(dto) };
  }

  @Put(':id')
  @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateDinhMucTienAnDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
