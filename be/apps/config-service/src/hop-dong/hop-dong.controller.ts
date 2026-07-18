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
import { HopDong_Service } from './hop-dong.service';
import type { HopDongFilter } from './hop-dong.service';
import { CreateHopDongDto, UpdateHopDongDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('hop-dong')
@UseGuards(JwtGuard)
export class HopDong_Controller {
  constructor(private readonly hopDong_Service: HopDong_Service) {}

  @Get()
  async findAll(@Query() query: HopDongFilter) {
    const data = await this.hopDong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.hopDong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateHopDongDto) {
    const data = await this.hopDong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateHopDongDto) {
    const data = await this.hopDong_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.hopDong_Service.remove(id);
    return { success: true, message: 'Xóa hợp đồng thành công' };
  }

  @Patch(':id/trang-thai')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.hopDong_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
