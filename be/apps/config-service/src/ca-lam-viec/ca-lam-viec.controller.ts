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
import { CaLamViec_Service } from './ca-lam-viec.service';
import type { CaLamViecFilter } from './ca-lam-viec.service';
import { CreateCaLamViecDto, UpdateCaLamViecDto } from './dto';
import { JwtGuard } from '@app/auth';

@Controller('ca-lam-viec')
@UseGuards(JwtGuard)
export class CaLamViec_Controller {
  constructor(private readonly caLamViec_Service: CaLamViec_Service) {}

  @Get()
  async findAll(@Query() query: CaLamViecFilter) {
    const data = await this.caLamViec_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.caLamViec_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateCaLamViecDto) {
    const data = await this.caLamViec_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateCaLamViecDto) {
    const data = await this.caLamViec_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.caLamViec_Service.remove(id);
    return { success: true, message: 'Xóa ca làm việc thành công' };
  }
}
