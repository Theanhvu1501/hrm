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
import { ThoiViec_Service } from './thoi-viec.service';
import type { ThoiViecFilter } from './thoi-viec.service';
import { CreateThoiViecDto, UpdateThoiViecDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('thoi-viec')
@UseGuards(JwtGuard)
export class ThoiViec_Controller {
  constructor(private readonly thoiViec_Service: ThoiViec_Service) {}

  @Get()
  async findAll(@Query() query: ThoiViecFilter) {
    const data = await this.thoiViec_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.thoiViec_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateThoiViecDto) {
    const data = await this.thoiViec_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateThoiViecDto) {
    const data = await this.thoiViec_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.thoiViec_Service.remove(id);
    return { success: true, message: 'Xóa hồ sơ thôi việc thành công' };
  }

  @Patch(':id/trang-thai')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string },
  ) {
    const data = await this.thoiViec_Service.updateStatus(id, body.trangThai);
    return { success: true, data };
  }
}
