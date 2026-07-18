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
import { TaiKhoanService } from './tai-khoan.service';
import { CreateTaiKhoanDto, UpdateTaiKhoanDto, TaiKhoanQueryDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';

@Controller('tai-khoan')
@UseGuards(JwtGuard, RoleGuard)
export class TaiKhoanController {
  constructor(private readonly taiKhoanService: TaiKhoanService) {}

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
  async findAll(@Query() query: TaiKhoanQueryDto) {
    const result = await this.taiKhoanService.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('hierarchy')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async getHierarchy() {
    const data = await this.taiKhoanService.getHierarchy();
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
    const data = await this.taiKhoanService.search(keyword || '', limit || 20);
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
    @Query('nhom') nhom?: string,
  ) {
    const total = await this.taiKhoanService.getTotal(search, nhom);
    return { success: true, data: { total } };
  }

  @Get('parents')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findParents() {
    const data = await this.taiKhoanService.findParents();
    return { success: true, data };
  }

  @Get('leaf')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findLeafAccounts() {
    const data = await this.taiKhoanService.findLeafAccounts();
    return { success: true, data };
  }

  @Get('nhom/:nhom')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findByNhom(@Param('nhom') nhom: string) {
    const data = await this.taiKhoanService.findByNhom(nhom);
    return { success: true, data };
  }

  @Get('by-ma/:ma')
  @Roles(
    'ADMIN',
    'KE_TOAN_TRUONG',
    'KE_TOAN_TONG_HOP',
    'KE_TOAN_QUY',
    'KE_TOAN_CONG_NO',
    'MANAGER',
    'KIEM_SOAT',
  )
  async findByMa(@Param('ma') ma: string) {
    const data = await this.taiKhoanService.findByMa(ma);
    if (!data) {
      return { success: false, data: null };
    }
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
    const data = await this.taiKhoanService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() createDto: CreateTaiKhoanDto) {
    const data = await this.taiKhoanService.create(createDto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: UpdateTaiKhoanDto) {
    const data = await this.taiKhoanService.update(id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string) {
    await this.taiKhoanService.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
