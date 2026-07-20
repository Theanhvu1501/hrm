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
import { TenantService } from './tenant.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  AddUserToTenantDto,
  UpdateTenantMemberDto,
  UpdateMemberProfileDto,
  UpdateTenantGlossaryDto,
  UpdateTenantDashboardDto,
} from '@app/dto';
import { JwtGuard, SuperAdminGuard, TenantAdminGuard, AdminGuard, CurrentUser, AuthToken } from '@app/auth';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ===== Tenant CRUD (Super Admin only) =====

  @Get()
  @UseGuards(JwtGuard, SuperAdminGuard)
  async findAll(@AuthToken() token: string) {
    const data = await this.tenantService.findAll(token);
    return { success: true, data };
  }

  @Get('users')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async getAllUsers(@AuthToken() token: string) {
    const data = await this.tenantService.getAllUsers(token);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async findOne(@AuthToken() token: string, @Param('id') id: string) {
    const data = await this.tenantService.findOne(token, id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtGuard, SuperAdminGuard)
  async create(@AuthToken() token: string, @Body() createDto: CreateTenantDto) {
    const data = await this.tenantService.create(token, createDto);
    return { success: true, data };
  }

  @Put('current/glossary')
  @UseGuards(JwtGuard)
  async updateCurrentGlossary(
    @AuthToken() token: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateTenantGlossaryDto,
  ) {
    const data = await this.tenantService.updateGlossary(token, tenantId, dto.glossary ?? {});
    return { success: true, data };
  }

  @Get('current/dashboard')
  @UseGuards(JwtGuard)
  async getCurrentDashboard(
    @AuthToken() token: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const dashboardBlocks = await this.tenantService.getDashboardBlocks(token, tenantId);
    return { success: true, data: { dashboardBlocks } };
  }

  @Put('current/dashboard')
  @UseGuards(JwtGuard, AdminGuard)
  async updateCurrentDashboard(
    @AuthToken() token: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDashboardDto,
  ) {
    const data = await this.tenantService.updateDashboardBlocks(
      token,
      tenantId,
      dto.dashboardBlocks ?? [],
    );
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async update(@AuthToken() token: string, @Param('id') id: string, @Body() updateDto: UpdateTenantDto) {
    const data = await this.tenantService.update(token, id, updateDto);
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(JwtGuard, SuperAdminGuard)
  async delete(@AuthToken() token: string, @Param('id') id: string) {
    await this.tenantService.delete(token, id);
    return { success: true, message: 'Xóa công ty thành công' };
  }

  // ===== Tenant Members (Super Admin + Tenant Admin) =====

  @Get(':id/members')
  @UseGuards(JwtGuard, TenantAdminGuard)
  async getMembers(@AuthToken() token: string, @Param('id') id: string) {
    const data = await this.tenantService.getTenantMembers(token, id);
    return { success: true, data };
  }

  @Post(':id/members')
  @UseGuards(JwtGuard, TenantAdminGuard)
  async addMember(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Body() dto: AddUserToTenantDto,
  ) {
    const data = await this.tenantService.addUserToTenant(token, id, dto);
    return { success: true, data };
  }

  @Put(':id/members/:userId')
  @UseGuards(JwtGuard, TenantAdminGuard)
  async updateMember(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateTenantMemberDto,
  ) {
    await this.tenantService.updateTenantMember(token, id, userId, dto);
    return { success: true, message: 'Cập nhật thành viên thành công' };
  }

  @Put(':id/members/:userId/profile')
  @UseGuards(JwtGuard, TenantAdminGuard)
  async updateMemberProfile(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberProfileDto,
  ) {
    const data = await this.tenantService.updateMemberProfile(token, id, userId, dto);
    return { success: true, data };
  }

  @Post(':id/members/:userId/reset-password')
  @UseGuards(JwtGuard, TenantAdminGuard)
  async resetMemberPassword(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const data = await this.tenantService.resetMemberPassword(token, id, userId);
    return { success: true, message: 'Đã reset mật khẩu về mặc định', data };
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtGuard, TenantAdminGuard)
  async removeMember(
    @AuthToken() token: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.tenantService.removeTenantMember(token, id, userId);
    return { success: true, message: 'Đã xóa thành viên khỏi công ty' };
  }
}
