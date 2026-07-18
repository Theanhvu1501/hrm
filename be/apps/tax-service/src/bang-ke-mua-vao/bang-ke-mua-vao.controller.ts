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
import { BangKeMuaVaoService } from './bang-ke-mua-vao.service';
import {
  CreateBangKeMuaVaoDto,
  UpdateBangKeMuaVaoDto,
  BangKeMuaVaoQueryDto,
  ImportBangKeMuaVaoDto,
  CheckDuplicatesDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { DeleteBatchDto } from '@app/dto';

const KE_TOAN_ROLES = [
  'ADMIN',
  'KE_TOAN_TRUONG',
  'KE_TOAN_TONG_HOP',
  'KE_TOAN_QUY',
  'KE_TOAN_CONG_NO',
  'MANAGER',
  'KIEM_SOAT',
];

@Controller('bang-ke-mua-vao')
@UseGuards(JwtGuard, RoleGuard)
export class BangKeMuaVaoController {
  constructor(private readonly service: BangKeMuaVaoService) {}

  @Get()
  @Roles(...KE_TOAN_ROLES)
  async findAll(@Query() query: BangKeMuaVaoQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get(':id')
  @Roles(...KE_TOAN_ROLES)
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY')
  async create(@Body() createDto: CreateBangKeMuaVaoDto) {
    const data = await this.service.create(createDto);
    return { success: true, data };
  }

  @Post('import')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY')
  async import(@Body() dto: ImportBangKeMuaVaoDto) {
    const data = await this.service.importMany(dto.items);
    return { success: true, data };
  }

  @Post('check-duplicates')
  @Roles(...KE_TOAN_ROLES)
  async checkDuplicates(@Body() dto: CheckDuplicatesDto) {
    const data = await this.service.checkDuplicates(dto.keys);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBangKeMuaVaoDto,
  ) {
    const data = await this.service.update(id, updateDto);
    return { success: true, data };
  }

  @Post('delete-batch')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async deleteBatch(@Body() dto: DeleteBatchDto) {
    const data = await this.service.deleteBatch(dto.ids);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true, message: 'Xóa thành công' };
  }
}
