import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { NganhService } from './nganh.service';
import { CreateNganhDto, UpdateNganhDto } from '@app/dto';
import { JwtGuard, SuperAdminGuard } from '@app/auth';

@Controller('nganh')
export class NganhController {
  constructor(private readonly nganhService: NganhService) {}

  @Get()
  @UseGuards(JwtGuard)
  async findAll() {
    const data = await this.nganhService.findAll();
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtGuard, SuperAdminGuard)
  async create(@Body() dto: CreateNganhDto) {
    const data = await this.nganhService.create(dto);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateNganhDto) {
    const data = await this.nganhService.update(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async delete(@Param('id') id: string) {
    await this.nganhService.delete(id);
    return { success: true, message: 'Xóa ngành thành công' };
  }
}
