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
import { NguoiDung_Service } from './nguoi-dung.service';
import {
  CreateNguoiDungDto,
  UpdateNguoiDungDto,
  PaginationQueryDto,
  AddExistingUserDto,
} from './dto';
import { JwtGuard, RoleGuard, Roles, AuthToken } from '@app/auth';

@Controller('nguoi-dung')
@UseGuards(JwtGuard, RoleGuard)
export class NguoiDung_Controller {
  constructor(private readonly nguoiDungService: NguoiDung_Service) {}

  @Get()
  @Roles('ADMIN')
  async findAll(@AuthToken() token: string, @Query() query: PaginationQueryDto) {
    const result = await this.nguoiDungService.findAll(token, query);
    return { success: true, ...result };
  }

  @Get('stats')
  @Roles('ADMIN')
  async getStats(@AuthToken() token: string) {
    const data = await this.nguoiDungService.getStats(token);
    return { success: true, data };
  }

  @Get('available-users')
  @Roles('ADMIN')
  async getAvailableUsers(
    @AuthToken() token: string,
    @Query('search') search?: string,
  ) {
    const data = await this.nguoiDungService.searchUsersNotInTenant(token, search);
    return { success: true, data };
  }

  @Post('add-existing')
  @Roles('ADMIN')
  async addExistingUser(@AuthToken() token: string, @Body() dto: AddExistingUserDto) {
    const data = await this.nguoiDungService.addExistingUser(token, dto);
    return { success: true, data };
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@AuthToken() token: string, @Param('id') id: string) {
    const data = await this.nguoiDungService.findOne(token, id);
    return { success: true, data };
  }

  @Post()
  @Roles('ADMIN')
  async create(@AuthToken() token: string, @Body() dto: CreateNguoiDungDto) {
    const data = await this.nguoiDungService.create(token, dto);
    return { success: true, data };
  }

  @Put(':id')
  @Roles('ADMIN')
  async update(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Body() dto: UpdateNguoiDungDto,
  ) {
    const data = await this.nguoiDungService.update(token, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@AuthToken() token: string, @Param('id') id: string) {
    await this.nguoiDungService.delete(token, id);
    return { success: true, message: 'Xóa thành công' };
  }

  @Patch(':id/toggle-status')
  @Roles('ADMIN')
  async toggleStatus(@AuthToken() token: string, @Param('id') id: string) {
    const data = await this.nguoiDungService.toggleStatus(token, id);
    return { success: true, data };
  }
}
