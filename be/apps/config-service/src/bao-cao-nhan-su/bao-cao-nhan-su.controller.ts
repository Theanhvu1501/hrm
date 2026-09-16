import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { BaoCaoNhanSu_Service } from './bao-cao-nhan-su.service';

/**
 * Báo cáo nhân sự (yêu cầu d47, d48).
 *
 * Dùng lại quyền `/nhan-su/ho-so-nhan-vien` — số liệu ở đây là tổng hợp của
 * chính hồ sơ nhân sự, và thêm một module quyền là thêm một bước cấp quyền dễ
 * quên lúc deploy (màn hình 403 với mọi người). Cùng tiền lệ với route
 * `/bao-cao/nhan-su` ở FE (`routePermissions.ts`).
 */
@Controller('bao-cao-nhan-su')
@UseGuards(JwtGuard)
export class BaoCaoNhanSu_Controller {
  constructor(private readonly service: BaoCaoNhanSu_Service) {}

  @Get('chi-so')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xem')
  async chiSo(@Query('ky') ky: string) {
    return { success: true, data: await this.service.chiSo(ky) };
  }

  @Get('su-dung-lao-dong')
  @UseGuards(PermissionGuard)
  @Permissions('/nhan-su/ho-so-nhan-vien:xuat')
  async suDungLaoDong(
    @Query('tuNgay') tuNgay: string,
    @Query('denNgay') denNgay: string,
  ) {
    return {
      success: true,
      data: await this.service.suDungLaoDong(tuNgay, denNgay),
    };
  }
}
