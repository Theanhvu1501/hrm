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
import { DoiTuongService } from './doi-tuong.service';
import { CreateDoiTuongDto, UpdateDoiTuongDto, DoiTuongQueryDto } from './dto';
import { DoiTuongType } from '@app/entities';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

@Controller('doi-tuong')
@UseGuards(JwtGuard, RoleGuard)
export class DoiTuongController {
  constructor(private readonly doiTuongService: DoiTuongService) {}

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
  async findAll(@Query() query: DoiTuongQueryDto) {
    const result = await this.doiTuongService.findAllPaginated(query);
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
  async getAll(@Query('loai') loai?: DoiTuongType) {
    const data = await this.doiTuongService.findAll(loai);
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
    @Query('loai') loai?: DoiTuongType,
    @Query('limit') limit?: number,
  ) {
    const data = await this.doiTuongService.search(
      keyword || '',
      loai,
      limit || 20,
    );
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
    @Query('loai') loai?: DoiTuongType,
  ) {
    const total = await this.doiTuongService.getTotal(search, loai);
    return { success: true, data: { total } };
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
    const data = await this.doiTuongService.getStats();
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
  async checkMaExists(
    @Query('ma') ma: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.doiTuongService.checkMaExists(ma, excludeId);
    return { success: true, data: { exists } };
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
    const data = await this.doiTuongService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async create(@Body() createDto: CreateDoiTuongDto) {
    const data = await this.doiTuongService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDoiTuongDto) {
    const data = await this.doiTuongService.update(id, updateDto);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.doiTuongService.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.doiTuongService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
