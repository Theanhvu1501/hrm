import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { QuyGio_Service } from './quy-gio.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';

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
 * Task 9 CHỈ dựng ba route đọc (danh sách HR, số dư của tôi, số dư theo
 * nhân viên) — route đóng quỹ/đối soát thuộc Task 12, không dựng ở đây.
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
}
