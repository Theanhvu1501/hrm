import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { LinhVucService } from './linh-vuc.service';
import { CreateLinhVucDto, UpdateLinhVucDto } from '@app/dto';
import { JwtGuard, SuperAdminGuard } from '@app/auth';

@Controller('linh-vuc')
export class LinhVucController {
  constructor(private readonly linhVucService: LinhVucService) {}

  @Get()
  @UseGuards(JwtGuard)
  async findAll() {
    const data = await this.linhVucService.findAll();
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtGuard, SuperAdminGuard)
  async create(@Body() dto: CreateLinhVucDto) {
    const data = await this.linhVucService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateLinhVucDto) {
    const data = await this.linhVucService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async delete(@Param('id') id: string) {
    await this.linhVucService.delete(id);
    return { success: true, message: 'Xóa lĩnh vực thành công' };
  }
}
