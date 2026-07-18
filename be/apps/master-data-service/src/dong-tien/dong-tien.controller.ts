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
import { DongTienService } from './dong-tien.service';
import { CreateDongTienDto, UpdateDongTienDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

@Controller('dong-tien')
@UseGuards(JwtGuard, RoleGuard)
export class DongTienController {
  constructor(private readonly dongTienService: DongTienService) {}

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
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.dongTienService.findAllPaginated(query);
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
    const data = await this.dongTienService.findAll();
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
    const data = await this.dongTienService.search(keyword || '', limit || 20);
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
  async getTotal(@Query('search') search?: string) {
    const total = await this.dongTienService.getTotal(search);
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
    const exists = await this.dongTienService.checkMaExists(ma, excludeId);
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
    const data = await this.dongTienService.getStats();
    return { success: true, data };
  }

  @Get('loai/:loai')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findByLoai(
    @Param('loai') loai: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.dongTienService.findByLoai(loai, limit || 100);
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
    const data = await this.dongTienService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async create(@Body() createDto: CreateDongTienDto) {
    const data = await this.dongTienService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDongTienDto) {
    const data = await this.dongTienService.update(id, updateDto);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.dongTienService.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.dongTienService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
