import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { QuyPhep_Service } from './quy-phep.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { DieuChinhQuyDto, ThaoTacNamDto } from './dto';

/**
 * Hai nhóm route như mọi module chấm công khác trong repo:
 *  - `cua-toi`: chỉ `JwtGuard`, employeeId LUÔN suy từ token — không bao giờ
 *    đọc từ body/query, dù client có cố gửi kèm.
 *  - quản trị: `PermissionGuard` + `@Permissions('/cham-cong/quy-phep:...')`.
 *
 * Không dùng `AdminGuard` (chỉ cho qua khi `vaiTro` bằng đúng chuỗi 'ADMIN',
 * thứ không ai có trên production) và không dùng `@Roles(...)` (`RoleGuard`
 * trong repo hiện `return true`).
 */
@Controller('quy-phep')
@UseGuards(JwtGuard)
export class QuyPhep_Controller {
  constructor(
    private readonly quyPhep_Service: QuyPhep_Service,
    private readonly nhanVien_Service: NhanVien_Service,
  ) {}

  /**
   * (P3.8 review round 4, IMPORTANT 9): ba route ghi quỹ trước đây đọc
   * `String(req.user?.id ?? '')` — mặc định về CHUỖI RỖNG khi thiếu id, cho
   * phép ghi `nguoiThucHien: ''` vào sổ biến động — đúng cái sổ mà toàn bộ
   * kiến trúc quỹ phép dựng lên để TRUY VẾT ai làm gì. Một actor rỗng là lỗ
   * hổng audit trail, không phải giá trị hợp lệ để mặc định vào — ném lỗi
   * thay vì âm thầm cho qua.
   */
  private nguoiThucHienTuToken(req: any): string {
    const id = req.user?.id;
    if (!id) {
      throw new UnauthorizedException(
        'Không xác định được người thực hiện thao tác',
      );
    }
    return String(id);
  }

  // ── Tự phục vụ + các route tên cố định: PHẢI khai TRƯỚC route ':id' bên
  // dưới, nếu không NestJS khớp "cua-toi"/"doi-soat" thành :id. ────────────

  @Get('cua-toi')
  async cuaToi(@Req() req: any) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    const data = await this.quyPhep_Service.layQuyCuaNhanVien(
      String((emp as any)._id),
    );
    return { success: true, data };
  }

  @Get('doi-soat')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-phep:xem')
  async doiSoat(@Query('employeeId') employeeId?: string) {
    const data = await this.quyPhep_Service.doiSoat(employeeId);
    return { success: true, data };
  }

  @Post('cap-dau-nam')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-phep:them')
  async capDauNam(@Body() body: ThaoTacNamDto, @Req() req: any) {
    if (body.xemTruoc) {
      const data = await this.quyPhep_Service.xemTruocCapPhepDauNam(body.nam);
      return { success: true, data };
    }
    const data = await this.quyPhep_Service.capPhepDauNam(
      body.nam,
      this.nguoiThucHienTuToken(req),
    );
    return { success: true, data };
  }

  @Post('dong-quy')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-phep:sua')
  async dongQuy(@Body() body: ThaoTacNamDto, @Req() req: any) {
    if (body.xemTruoc) {
      const data = await this.quyPhep_Service.xemTruocDongQuy(body.nam);
      return { success: true, data };
    }
    const data = await this.quyPhep_Service.dongQuy(
      body.nam,
      this.nguoiThucHienTuToken(req),
    );
    return { success: true, data };
  }

  @Post('dieu-chinh')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-phep:sua')
  async dieuChinh(@Body() body: DieuChinhQuyDto, @Req() req: any) {
    const data = await this.quyPhep_Service.dieuChinhTay(
      body.employeeId,
      body.balanceId,
      body.soNgay,
      body.ghiChu,
      this.nguoiThucHienTuToken(req),
    );
    return { success: true, data };
  }

  @Get(':id/so-bien-dong')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-phep:xem')
  async soBienDong(@Param('id') id: string) {
    const data = await this.quyPhep_Service.laySoBienDong(id);
    return { success: true, data };
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-phep:xem')
  async findAll(@Query('employeeId') employeeId?: string) {
    const data = employeeId
      ? await this.quyPhep_Service.layQuyCuaNhanVien(employeeId)
      : await this.quyPhep_Service.layTatCaQuy();
    return { success: true, data };
  }
}
