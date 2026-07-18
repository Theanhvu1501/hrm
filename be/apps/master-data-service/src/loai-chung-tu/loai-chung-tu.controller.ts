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
import { LoaiChungTuService } from './loai-chung-tu.service';
import { CreateLoaiChungTuDto, UpdateLoaiChungTuDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto, PaginationQueryDto } from '@app/dto';

@Controller('loai-chung-tu')
@UseGuards(JwtGuard, RoleGuard)
export class LoaiChungTuController {
  constructor(private readonly loaiChungTuService: LoaiChungTuService) {}

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
    const result = await this.loaiChungTuService.findAllPaginated(query);
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
    const data = await this.loaiChungTuService.findAll();
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
    const data = await this.loaiChungTuService.search(
      keyword || '',
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
  async getTotal(@Query('search') search?: string) {
    const total = await this.loaiChungTuService.getTotal(search);
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
    const exists = await this.loaiChungTuService.checkMaExists(ma, excludeId);
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
    const data = await this.loaiChungTuService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async create(@Body() createDto: CreateLoaiChungTuDto) {
    const data = await this.loaiChungTuService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateLoaiChungTuDto,
  ) {
    const data = await this.loaiChungTuService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.loaiChungTuService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Post('delete-batch')
  @Roles('ADMIN')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.loaiChungTuService.deleteBatch(dto.ids);
    return { success: true, data };
  }
}
