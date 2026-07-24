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
  Req,
  UseGuards,
} from '@nestjs/common';
import { DonChamCong_Service } from './don-cham-cong.service';
import type { DonChamCongFilter } from './don-cham-cong.service';
import {
  CreateDonChamCongDto,
  UpdateDonChamCongDto,
  TaoDonCuaToiDto,
} from './dto';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { AdminGuard, JwtGuard } from '@app/auth';

/**
 * Đây từng là lỗ hổng bảo mật đang khai thác được: `@UseGuards(JwtGuard)` ở
 * cấp controller, KHÔNG route ghi nào có `AdminGuard`, và `create()` đọc
 * `employeeId` thẳng từ body — bất kỳ tài khoản đăng nhập nào cũng
 * tạo/sửa/xoá đơn của người khác, hoặc tự duyệt đơn của chính mình.
 *
 * Vá bằng cách tách hai nhóm route, cùng khuôn mẫu
 * `ThietBiChamCong_Controller`/`BanGhiChamCong_Controller` đã dùng ở các
 * module chấm công khác trong repo này:
 *  - Tự phục vụ (`cua-toi`): chỉ `JwtGuard`, `employeeId` LUÔN suy từ token
 *    qua `NhanVien_Service.resolveEmployeeFromUser(req.user)` — không bao
 *    giờ đọc từ body/query, dù client có cố gửi kèm.
 *  - Quản trị: thêm `AdminGuard` (kiểm `vaiTro`), KHÔNG dùng `@Roles(...)` —
 *    `RoleGuard` trong repo hiện chỉ `return true` nên mọi `@Roles` vô hiệu.
 */
@Controller('don-cham-cong')
@UseGuards(JwtGuard)
export class DonChamCong_Controller {
  constructor(
    private readonly donChamCong_Service: DonChamCong_Service,
    private readonly nhanVien_Service: NhanVien_Service,
  ) {}

  // ── Tự phục vụ — PHẢI khai TRƯỚC mọi route dùng ':id' bên dưới. Nếu
  // không, NestJS khớp chuỗi "cua-toi" thành :id — nhân viên gọi
  // GET /don-cham-cong/cua-toi sẽ bị route findOne(':id') nuốt mất, và vì
  // findOne có AdminGuard nên còn nhận nhầm 403. ─────────────────────────

  @Get('cua-toi')
  async cuaToi(@Query() query: DonChamCongFilter, @Req() req: any) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    const data = await this.donChamCong_Service.findAll({
      ...query,
      // Ghi đè SAU khi spread query: employeeId gửi kèm (nếu có) bị vô hiệu
      // hoàn toàn — đây là toàn bộ ranh giới ngăn xem đơn của đồng nghiệp.
      employeeId: String((emp as any)._id),
    });
    return { success: true, data };
  }

  @Post('cua-toi')
  async taoChoChinhMinh(@Body() body: TaoDonCuaToiDto, @Req() req: any) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    const data = await this.donChamCong_Service.create({
      ...body,
      // TaoDonCuaToiDto cố tình không có field employeeId (xem DTO) nên
      // spread ở trên không thể mang theo employeeId của client — luôn là
      // giá trị suy từ token được gán ở đây.
      employeeId: String((emp as any)._id),
    } as CreateDonChamCongDto);
    return { success: true, data };
  }

  @Delete('cua-toi/:id')
  async huyCuaToi(@Param('id') id: string, @Req() req: any) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    await this.donChamCong_Service.huyDonCuaToi(id, String((emp as any)._id));
    return { success: true, message: 'Huỷ đơn chấm công thành công' };
  }

  // ── Quản trị — AdminGuard trên từng route ───────────────────────────────

  @Get()
  @UseGuards(AdminGuard)
  async findAll(@Query() query: DonChamCongFilter) {
    const data = await this.donChamCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async findOne(@Param('id') id: string) {
    const data = await this.donChamCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() body: CreateDonChamCongDto) {
    const data = await this.donChamCong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() body: UpdateDonChamCongDto) {
    const data = await this.donChamCong_Service.update(id, body);
    return { success: true, data };
  }

  @Patch(':id/trang-thai')
  @UseGuards(AdminGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { trangThai: string; nguoiDuyet?: string },
    @Req() req: any,
  ) {
    // req.user LUÔN là người thực hiện thật (qua JwtGuard/AdminGuard),
    // KHÔNG BAO GIỜ đọc "ai duyệt" từ body — đó là điều kiện DUY NHẤT giúp
    // service chặn được tự duyệt.
    const data = await this.donChamCong_Service.updateStatus(
      id,
      body.trangThai,
      body.nguoiDuyet,
      req.user,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.donChamCong_Service.remove(id);
    return { success: true, message: 'Xóa đơn chấm công thành công' };
  }
}
