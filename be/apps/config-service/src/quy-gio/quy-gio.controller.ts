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
import { QuyGio_Service } from './quy-gio.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { DongQuyGioDto } from './dto';

/**
 * Hai nhóm route như mọi module chấm công khác trong repo:
 *  - `cua-toi`: chỉ `JwtGuard`, employeeId LUÔN suy từ token — không bao giờ
 *    đọc từ body/query, dù client có cố gửi kèm.
 *  - quản trị: `PermissionGuard` + `@Permissions('/cham-cong/quy-gio:...')`.
 *
 * Không dùng `AdminGuard` (chỉ cho qua khi `vaiTro` bằng đúng chuỗi 'ADMIN',
 * thứ không ai có trên production) và không dùng `@Roles(...)` (`RoleGuard`
 * trong repo hiện `return true`).
 *
 * Task 9 dựng ba route đọc (danh sách HR, số dư của tôi, số dư theo nhân
 * viên). Task 12 bồi thêm xem-trước/đóng quỹ hết hạn và đối soát sổ.
 */
@Controller('quy-gio')
@UseGuards(JwtGuard)
export class QuyGio_Controller {
  constructor(
    private readonly quyGio_Service: QuyGio_Service,
    private readonly nhanVien_Service: NhanVien_Service,
  ) {}

  private homNay(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // ── cua-toi PHẢI khai TRƯỚC route ':employeeId/so-du' bên dưới, nếu không
  // NestJS khớp "cua-toi" thành :employeeId. ─────────────────────────────

  /** Số dư của CHÍNH người đang đăng nhập — form đơn nghỉ bù đọc route này. */
  @Get('cua-toi/so-du')
  async soDuCuaToi(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Token thiếu định danh người dùng');
    }

    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    return this.quyGio_Service.soDuKhaDung(
      String((emp as any)._id),
      this.homNay(),
    );
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:xem')
  async danhSach(@Query('employeeId') employeeId?: string) {
    if (!employeeId) return [];
    return this.quyGio_Service.layQuyCuaNhanVien(employeeId);
  }

  @Get(':employeeId/so-du')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:xem')
  async soDu(@Param('employeeId') employeeId: string) {
    return this.quyGio_Service.soDuKhaDung(employeeId, this.homNay());
  }

  /** Xem trước quỹ sẽ bị đóng nếu chạy `dong-quy` — không ghi gì. */
  @Get('xem-truoc-dong-quy')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:sua')
  async xemTruocDongQuy(@Query('den') den?: string) {
    return this.quyGio_Service.xemTruocDongQuy(den || this.homNay());
  }

  @Post('dong-quy')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:sua')
  async dongQuy(@Body() body: DongQuyGioDto, @Req() req: any) {
    const id = req.user?.id;
    // Sổ biến động dựng lên để TRUY VẾT ai làm gì — actor rỗng là lỗ hổng
    // audit trail, không phải giá trị hợp lệ để mặc định vào.
    if (!id) throw new UnauthorizedException('Token thiếu định danh người dùng');
    return this.quyGio_Service.dongQuyGio(body.den || this.homNay(), String(id));
  }

  @Get(':employeeId/doi-soat')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:xem')
  async doiSoat(@Param('employeeId') employeeId: string) {
    return this.quyGio_Service.doiSoat(employeeId);
  }
}
