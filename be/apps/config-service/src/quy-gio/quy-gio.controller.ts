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
 *
 * ⚠️ MỌI handler PHẢI trả `{ success: true, data }` (review nhánh, CRITICAL 1).
 * Không có interceptor bọc phản hồi nào trong config-service —
 * `main.ts` chỉ cài `LoggingInterceptor`, một `tap()` không biến đổi gì. Phía
 * FE, `ServiceBase.parseResponse()` (`fe/src/services/base/service-base.ts`)
 * kết thúc bằng `return response.data as T`, nên một handler trả object THÔ
 * sẽ về tới FE thành `undefined` — `soDuCuaToi()` nổ TypeError trong
 * `transform()` (bị `.catch()` của banner nuốt, số dư không bao giờ hiện,
 * khoá nút Lưu không bao giờ bật) và `layTheoNhanVien()` gọi `.map` trên
 * `undefined` (màn HR "Quỹ giờ làm thêm" trắng dữ liệu vĩnh viễn). Mọi
 * controller anh em trong repo đều bọc — xem `quy-phep.controller.ts`,
 * `don-cham-cong.controller.ts`, `nhan-vien.controller.ts`.
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
    const data = await this.quyGio_Service.soDuKhaDung(
      String((emp as any)._id),
      this.homNay(),
    );
    return { success: true, data };
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:xem')
  async danhSach(@Query('employeeId') employeeId?: string) {
    const data = employeeId
      ? await this.quyGio_Service.layQuyCuaNhanVien(employeeId)
      : [];
    return { success: true, data };
  }

  @Get(':employeeId/so-du')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:xem')
  async soDu(@Param('employeeId') employeeId: string) {
    const data = await this.quyGio_Service.soDuKhaDung(
      employeeId,
      this.homNay(),
    );
    return { success: true, data };
  }

  /** Xem trước quỹ sẽ bị đóng nếu chạy `dong-quy` — không ghi gì. */
  @Get('xem-truoc-dong-quy')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:sua')
  async xemTruocDongQuy(@Query('den') den?: string) {
    const data = await this.quyGio_Service.xemTruocDongQuy(
      den || this.homNay(),
    );
    return { success: true, data };
  }

  @Post('dong-quy')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:sua')
  async dongQuy(@Body() body: DongQuyGioDto, @Req() req: any) {
    const id = req.user?.id;
    // Sổ biến động dựng lên để TRUY VẾT ai làm gì — actor rỗng là lỗ hổng
    // audit trail, không phải giá trị hợp lệ để mặc định vào.
    if (!id) throw new UnauthorizedException('Token thiếu định danh người dùng');
    const data = await this.quyGio_Service.dongQuyGio(
      body.den || this.homNay(),
      String(id),
    );
    return { success: true, data };
  }

  @Get(':employeeId/doi-soat')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/quy-gio:xem')
  async doiSoat(@Param('employeeId') employeeId: string) {
    const data = await this.quyGio_Service.doiSoat(employeeId);
    return { success: true, data };
  }
}
