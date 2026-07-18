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
import { NhomQuanLyService } from './nhom-quan-ly.service';
import {
  CreateNhomQuanLyDto,
  UpdateNhomQuanLyDto,
  NhomQuanLyQueryDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

@Controller('nhom-quan-ly')
@UseGuards(JwtGuard, RoleGuard)
export class NhomQuanLyController {
  constructor(private readonly nhomQuanLyService: NhomQuanLyService) {}

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
  async findAll(@Query() query: NhomQuanLyQueryDto) {
    const result = await this.nhomQuanLyService.findAllPaginated(query);
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
    const data = await this.nhomQuanLyService.findAll();
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
    const data = await this.nhomQuanLyService.search(
      keyword || '',
      limit || 20,
    );
    return { success: true, data };
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
    const exists = await this.nhomQuanLyService.checkMaExists(ma, excludeId);
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
    const data = await this.nhomQuanLyService.getStats();
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
    const data = await this.nhomQuanLyService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async create(@Body() createDto: CreateNhomQuanLyDto) {
    const data = await this.nhomQuanLyService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'MANAGER')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNhomQuanLyDto,
  ) {
    const data = await this.nhomQuanLyService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.nhomQuanLyService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.nhomQuanLyService.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
