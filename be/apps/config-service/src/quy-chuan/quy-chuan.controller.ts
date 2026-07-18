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
import { QuyChuan_Service } from './quy-chuan.service';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';
import { CreateQuyChuan_Dto, UpdateQuyChuan_Dto } from './dto';

@Controller('quy-chuan')
@UseGuards(JwtGuard, RoleGuard)
export class QuyChuan_Controller {
  constructor(private readonly quyChuan_Service: QuyChuan_Service) {}

  @Get()
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
  )
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('loaiGiaoDich') loaiGiaoDich?: string,
  ) {
    // If pagination params provided, return paginated result
    if (page || limit) {
      const result = await this.quyChuan_Service.findAllPaginated({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        keyword,
        loaiGiaoDich,
      });
      return { success: true, data: result.data, meta: result.meta };
    }

    // Otherwise return all data (backward compatible)
    const data = await this.quyChuan_Service.findAll();
    return { success: true, data };
  }

  @Get('stats')
  @Roles('ADMIN',
    'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER')
  async getStats(@Query('keyword') keyword?: string) {
    const data = await this.quyChuan_Service.getStats(keyword);
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
  )
  async search(
    @Query('keyword') keyword: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('loaiGiaoDich') loaiGiaoDich?: string,
  ) {
    // If pagination params provided, use paginated method
    if (page || limit) {
      const result = await this.quyChuan_Service.findAllPaginated({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        keyword: keyword || '',
        loaiGiaoDich,
      });
      return { success: true, data: result.data, meta: result.meta };
    }

    // Otherwise return all matching data
    const data = await this.quyChuan_Service.search(keyword || '');
    return { success: true, data };
  }

  @Get('by-loai/:loai')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
  )
  async findByLoaiGiaoDich(@Param('loai') loai: string) {
    const data = await this.quyChuan_Service.findByLoaiGiaoDich(loai);
    return { success: true, data };
  }

  @Get('suggested-accounts')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
  )
  async getSuggestedAccounts(
    @Query('loaiGiaoDich') loaiGiaoDich: string,
    @Query('nghiepVu') nghiepVu: string,
  ) {
    const data = await this.quyChuan_Service.getSuggestedAccounts(
      loaiGiaoDich,
      nghiepVu,
    );
    return { success: true, data };
  }

  @Get('duplicate-check')
  @Roles('ADMIN',
    'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER')
  async duplicateCheck(
    @Query('loaiGiaoDich') loaiGiaoDich: string,
    @Query('nghiepVu') nghiepVu: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const exists = await this.quyChuan_Service.duplicateCheck(
      loaiGiaoDich,
      nghiepVu,
      excludeId,
    );
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
  )
  async findOne(@Param('id') id: string) {
    const data = await this.quyChuan_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() createDto: CreateQuyChuan_Dto) {
    const data = await this.quyChuan_Service.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: UpdateQuyChuan_Dto) {
    const data = await this.quyChuan_Service.update(id, updateDto);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.quyChuan_Service.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.quyChuan_Service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
