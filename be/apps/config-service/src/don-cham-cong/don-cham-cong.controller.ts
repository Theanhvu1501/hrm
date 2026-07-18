import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DonChamCong_Service } from './don-cham-cong.service';
import type { DonChamCongFilter } from './don-cham-cong.service';
import { CreateDonChamCongDto, UpdateDonChamCongDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('don-cham-cong')
@UseGuards(JwtGuard)
export class DonChamCong_Controller {
  constructor(private readonly donChamCong_Service: DonChamCong_Service) {}

  @Get()
  async findAll(@Query() query: DonChamCongFilter) {
    const data = await this.donChamCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.donChamCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateDonChamCongDto) {
    const data = await this.donChamCong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateDonChamCongDto) {
    const data = await this.donChamCong_Service.update(id, body);
    return { success: true, data };
  }

  @Patch(':id/trang-thai')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string; nguoiDuyet?: string },
  ) {
    const data = await this.donChamCong_Service.updateStatus(
      id,
      body.trangThai,
      body.nguoiDuyet,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.donChamCong_Service.remove(id);
    return { success: true, message: 'Xóa đơn chấm công thành công' };
  }
}
