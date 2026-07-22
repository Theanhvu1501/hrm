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
import { NgayLe_Service } from './ngay-le.service';
import type { NgayLeFilter } from './ngay-le.service';
import { CreateNgayLeDto, UpdateNgayLeDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('ngay-le')
@UseGuards(JwtGuard)
export class NgayLe_Controller {
  constructor(private readonly ngayLe_Service: NgayLe_Service) {}

  @Get()
  async findAll(@Query() query: NgayLeFilter) {
    const data = await this.ngayLe_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.ngayLe_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateNgayLeDto) {
    const data = await this.ngayLe_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateNgayLeDto) {
    const data = await this.ngayLe_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ngayLe_Service.remove(id);
    return { success: true, message: 'Xóa ngày lễ thành công' };
  }
}
