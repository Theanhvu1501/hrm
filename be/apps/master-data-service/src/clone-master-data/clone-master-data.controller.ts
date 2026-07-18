import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtGuard, SuperAdminGuard } from '@app/auth';
import { CloneMasterDataService } from './clone-master-data.service';

interface CloneBody { sourceTenantId: string; targetTenantId: string; categories: string[]; }

@Controller('clone')
@UseGuards(JwtGuard, SuperAdminGuard)
export class CloneMasterDataController {
  constructor(private readonly service: CloneMasterDataService) {}

  @Get('categories')
  getCategories() {
    return { success: true, data: this.service.getCategories() };
  }

  @Post('preview')
  @HttpCode(200)
  async preview(@Body() body: CloneBody) {
    const data = await this.service.preview(body.sourceTenantId, body.targetTenantId, body.categories ?? []);
    return { success: true, data };
  }

  @Post('execute')
  async execute(@Body() body: CloneBody) {
    const data = await this.service.execute(body.sourceTenantId, body.targetTenantId, body.categories ?? []);
    return { success: true, data };
  }
}
