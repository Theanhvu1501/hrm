import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { VaiTro_Service } from './vai-tro.service';
import { JwtGuard } from '@app/auth';

@Controller('vai-tro')
@UseGuards(JwtGuard)
export class VaiTro_Controller {
  constructor(private readonly vaiTro_Service: VaiTro_Service) {}

  @Get()
  async findAll() {
    const data = await this.vaiTro_Service.findAll();
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.vaiTro_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: { ten: string; moTa?: string; isActive?: boolean }) {
    const data = await this.vaiTro_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ ten: string; moTa: string; isActive: boolean }>,
  ) {
    const data = await this.vaiTro_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.vaiTro_Service.delete(id);
    return { success: true, message: 'Xóa vai trò thành công' };
  }
}
