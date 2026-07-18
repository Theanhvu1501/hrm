import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { DeXuatMuaService } from './de-xuat-mua.service';
import { CreateDeXuatMuaDto, UpdateDeXuatMuaDto, RejectDeXuatDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

const READ = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER'];
const DUYET = ['ADMIN', 'KE_TOAN_TRUONG', 'MANAGER'];

@Controller('de-xuat-mua')
@UseGuards(JwtGuard, RoleGuard)
export class DeXuatMuaController {
  constructor(private readonly service: DeXuatMuaService) {}

  @Get() @Roles(...READ)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get(':id') @Roles(...READ)
  async findOne(@Param('id') id: string) { return { success: true, data: await this.service.findOne(id) }; }

  @Post() @Roles(...WRITE)
  async create(@Body() dto: CreateDeXuatMuaDto) { return { success: true, data: await this.service.create(dto) }; }

  @Put(':id') @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateDeXuatMuaDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Post(':id/submit') @Roles(...WRITE)
  async submit(@Param('id') id: string) { return { success: true, data: await this.service.submit(id) }; }

  @Post(':id/approve') @Roles(...DUYET)
  async approve(@Param('id') id: string) { return { success: true, data: await this.service.approve(id) }; }

  @Post(':id/reject') @Roles(...DUYET)
  async reject(@Param('id') id: string, @Body() dto: RejectDeXuatDto) {
    return { success: true, data: await this.service.reject(id, dto.lyDoTuChoi) };
  }

  @Post('delete-batch') @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id') @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) { await this.service.delete(id); return { success: true, message: 'Xóa thành công' }; }

  @Post(':id/nhan-hang') @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
  async nhanHang(@Param('id') id: string, @Headers('authorization') authToken?: string) {
    return { success: true, data: await this.service.nhanHang(id, authToken) };
  }
}
