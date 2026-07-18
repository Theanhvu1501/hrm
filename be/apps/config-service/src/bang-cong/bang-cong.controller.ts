import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BangCong_Service } from './bang-cong.service';
import type { BangCongFilter } from './bang-cong.service';
import { UpdateTimesheetDto, ThangDto, SetDayDto } from './dto';
import { KY_HIEU_CHAM_CONG } from './cham-cong-ky-hieu';
import { JwtGuard } from '@app/auth';

@Controller('bang-cong')
@UseGuards(JwtGuard)
export class BangCong_Controller {
  constructor(private readonly bangCong_Service: BangCong_Service) {}

  @Get('ky-hieu')
  async kyHieu() {
    return { success: true, data: KY_HIEU_CHAM_CONG };
  }

  @Get()
  async findAll(@Query() query: BangCongFilter) {
    const data = await this.bangCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.bangCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post('generate')
  async generate(@Body() body: ThangDto) {
    const data = await this.bangCong_Service.generate(body.thang);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateTimesheetDto) {
    const data = await this.bangCong_Service.update(id, body);
    return { success: true, data };
  }

  @Patch(':id/ngay')
  async setDay(@Param('id') id: string, @Body() body: SetDayDto) {
    const data = await this.bangCong_Service.setDay(id, body);
    return { success: true, data };
  }

  @Post('finalize')
  async finalize(@Body() body: ThangDto) {
    const data = await this.bangCong_Service.finalize(body.thang);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.bangCong_Service.remove(id);
    return { success: true, message: 'Xóa bảng công thành công' };
  }
}
