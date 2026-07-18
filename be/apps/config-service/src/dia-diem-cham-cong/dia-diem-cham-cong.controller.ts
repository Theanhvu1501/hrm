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
import { DiaDiemChamCong_Service } from './dia-diem-cham-cong.service';
import type { DiaDiemChamCongFilter } from './dia-diem-cham-cong.service';
import { CreateDiaDiemChamCongDto, UpdateDiaDiemChamCongDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('dia-diem-cham-cong')
@UseGuards(JwtGuard)
export class DiaDiemChamCong_Controller {
  constructor(
    private readonly diaDiemChamCong_Service: DiaDiemChamCong_Service,
  ) {}

  @Get()
  async findAll(@Query() query: DiaDiemChamCongFilter) {
    const data = await this.diaDiemChamCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.diaDiemChamCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateDiaDiemChamCongDto) {
    const data = await this.diaDiemChamCong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateDiaDiemChamCongDto,
  ) {
    const data = await this.diaDiemChamCong_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.diaDiemChamCong_Service.remove(id);
    return { success: true, message: 'Xóa địa điểm chấm công thành công' };
  }
}
