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
import { PhieuKhoService } from './phieu-kho.service';
import { CreatePhieuKhoDto, UpdatePhieuKhoDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

@Controller('phieu')
@UseGuards(JwtGuard, RoleGuard)
export class PhieuKhoController {
  constructor(private readonly phieuKhoService: PhieuKhoService) {}

  @Get()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('loaiPhieu') loaiPhieu?: string,
    @Query('tuNgay') tuNgay?: string,
    @Query('denNgay') denNgay?: string,
  ) {
    const result = await this.phieuKhoService.findAllPaginated({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
      loaiPhieu,
      tuNgay,
      denNgay,
    });
    return { success: true, ...result };
  }

  // IMPORTANT: next-so and stats must be declared BEFORE :id
  @Get('next-so')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async nextSo(@Query('loaiPhieu') loaiPhieu: string) {
    const soPhieu = await this.phieuKhoService.getNextSo(loaiPhieu);
    return { success: true, data: { soPhieu } };
  }

  @Get('stats')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async stats(@Query('loaiPhieu') loaiPhieu?: string) {
    const data = await this.phieuKhoService.getStats(loaiPhieu);
    return { success: true, data };
  }

  @Get(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async findOne(@Param('id') id: string) {
    const data = await this.phieuKhoService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async create(@Body() dto: CreatePhieuKhoDto) {
    const data = await this.phieuKhoService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER')
  async update(@Param('id') id: string, @Body() dto: UpdatePhieuKhoDto) {
    const data = await this.phieuKhoService.update(id, dto);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.phieuKhoService.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async remove(@Param('id') id: string) {
    await this.phieuKhoService.remove(id);
    return { success: true };
  }
}
