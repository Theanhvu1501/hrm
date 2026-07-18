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
import { QuaTrinhCongTac_Service } from './qua-trinh-cong-tac.service';
import type { QuaTrinhCongTacFilter } from './qua-trinh-cong-tac.service';
import {
  CreateQuaTrinhCongTacDto,
  UpdateQuaTrinhCongTacDto,
} from './dto';
import { JwtGuard } from '@app/auth';

@Controller('qua-trinh-cong-tac')
@UseGuards(JwtGuard)
export class QuaTrinhCongTac_Controller {
  constructor(
    private readonly quaTrinhCongTac_Service: QuaTrinhCongTac_Service,
  ) {}

  @Get()
  async findAll(@Query() query: QuaTrinhCongTacFilter) {
    const data = await this.quaTrinhCongTac_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.quaTrinhCongTac_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateQuaTrinhCongTacDto) {
    const data = await this.quaTrinhCongTac_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateQuaTrinhCongTacDto,
  ) {
    const data = await this.quaTrinhCongTac_Service.update(id, body);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.quaTrinhCongTac_Service.remove(id);
    return { success: true, message: 'Xóa quá trình công tác thành công' };
  }
}
