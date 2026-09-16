import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';
import { TamUng_Service } from './tam-ung.service';
import type { TamUngFilter } from './tam-ung.service';
import { CreateTamUngDto, DuyetTamUngDto } from './dto';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { ngayVN } from '../ban-ghi-cham-cong/thoi-gian.util';

/**
 * Tạm ứng lương (yêu cầu d30).
 *
 * Hai nhóm route:
 *  - `cua-toi/*` — TỰ PHỤC VỤ: nhân viên tự lập đơn và xem đơn CỦA MÌNH.
 *    Không gắn `@Permissions` (mọi nhân viên đều phải nộp được đơn, kể cả
 *    người chưa được gán vai trò); phạm vi khoá bằng `employeeId` suy từ token.
 *  - còn lại — quản trị, cần `/luong/tam-ung:*`.
 *
 * Đây là MODULE QUYỀN MỚI: phải chạy `ops/grant-quyen-module-moi.ts` lúc
 * deploy, nếu không màn hình 403 với tất cả mọi người.
 */
@Controller('tam-ung')
@UseGuards(JwtGuard)
export class TamUng_Controller {
  constructor(
    private readonly service: TamUng_Service,
    private readonly nhanVien_Service: NhanVien_Service,
  ) {}

  private async idCuaToi(req: any): Promise<string> {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    return String((emp as any)._id);
  }

  /** Đơn của CHÍNH người đang đăng nhập. */
  @Get('cua-toi')
  async cuaToi(@Req() req: any) {
    const employeeId = await this.idCuaToi(req);
    return { success: true, data: await this.service.findAll({ employeeId }) };
  }

  /** Nhân viên tự lập đơn cho chính mình. */
  @Post('cua-toi')
  async taoCuaToi(@Body() dto: CreateTamUngDto, @Req() req: any) {
    const employeeId = await this.idCuaToi(req);
    // `dto.employeeId` (nếu client có gửi) bị BỎ QUA ở đường này — nhận nó là
    // mở đúng cánh cửa "lập đơn ứng tiền dưới tên người khác".
    const data = await this.service.create(dto, employeeId);
    return { success: true, data };
  }

  /** Nhân viên huỷ đơn CHƯA duyệt của chính mình. */
  @Delete('cua-toi/:id')
  async huyCuaToi(@Param('id') id: string, @Req() req: any) {
    await this.service.kiemChuNhan(id, await this.idCuaToi(req));
    await this.service.remove(id);
    return { success: true, message: 'Đã huỷ đơn tạm ứng' };
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/luong/tam-ung:xem')
  async findAll(@Query() query: TamUngFilter) {
    return { success: true, data: await this.service.findAll(query) };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/luong/tam-ung:them')
  async create(@Body() dto: CreateTamUngDto, @Req() req: any) {
    // Lập đơn hộ người khác: bắt buộc chỉ rõ nhân viên nào.
    const employeeId = dto.employeeId ?? (await this.idCuaToi(req));
    const data = await this.service.create(dto, employeeId);
    return { success: true, data };
  }

  @Patch(':id/duyet')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/tam-ung:sua')
  async duyet(
    @Param('id') id: string,
    @Body() dto: DuyetTamUngDto,
    @Req() req: any,
  ) {
    const data = await this.service.duyet(
      id,
      dto,
      req.user?.email ?? req.user?.id ?? 'không rõ',
      ngayVN(new Date()),
    );
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/tam-ung:xoa')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { success: true, message: 'Đã huỷ đơn tạm ứng' };
  }
}
