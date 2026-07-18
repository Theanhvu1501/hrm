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
import { NhomKhoanMucService } from './nhom-khoan-muc.service';
import { CreateNhomKhoanMucDto, UpdateNhomKhoanMucDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';
import { NhomKhoanMucLoai } from '@app/entities';

@Controller('nhom-khoan-muc')
@UseGuards(JwtGuard, RoleGuard)
export class NhomKhoanMucController {
  constructor(private readonly nhomKhoanMucService: NhomKhoanMucService) {}

  @Get()
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findAll(@Query() query: PaginationQueryDto & { loai?: string }) {
    const result = await this.nhomKhoanMucService.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getAll(@Query('loai') loai?: NhomKhoanMucLoai) {
    const data = await this.nhomKhoanMucService.findAll(loai);
    return { success: true, data };
  }

  @Get('stats')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getStats() {
    const data = await this.nhomKhoanMucService.getStats();
    return { success: true, data };
  }

  @Get('check-ma')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async checkMa(
    @Query('ma') ma: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.nhomKhoanMucService.checkMaExists(ma, excludeId);
    return { success: true, data: { exists } };
  }

  @Get(':id')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'KE_TOAN_TONG_HOP',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findOne(@Param('id') id: string) {
    const data = await this.nhomKhoanMucService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async create(@Body() createDto: CreateNhomKhoanMucDto) {
    const data = await this.nhomKhoanMucService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNhomKhoanMucDto,
  ) {
    const data = await this.nhomKhoanMucService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) {
    await this.nhomKhoanMucService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.nhomKhoanMucService.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
