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
  CapNhatTrangThaiDto,
} from './dto';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Đây từng là lỗ hổng bảo mật đang khai thác được: `@UseGuards(JwtGuard)` ở
 * cấp controller, KHÔNG route ghi nào có hàng rào phân quyền, và `create()`
 * đọc `employeeId` thẳng từ body — bất kỳ tài khoản đăng nhập nào cũng
 * tạo/sửa/xoá đơn của người khác, hoặc tự duyệt đơn của chính mình.
 *
 * Vá bằng cách tách hai nhóm route, cùng khuôn mẫu
 * `ThietBiChamCong_Controller`/`BanGhiChamCong_Controller` đã dùng ở các
 * module chấm công khác trong repo này:
 *  - Tự phục vụ (`cua-toi`): chỉ `JwtGuard`, `employeeId` LUÔN suy từ token
 *    qua `NhanVien_Service.resolveEmployeeFromUser(req.user)` — không bao
 *    giờ đọc từ body/query, dù client có cố gửi kèm.
 *  - Quản trị: thêm `PermissionGuard` + `@Permissions('/cham-cong/don-tu:...')`.
 *
 * Hàng rào là `PermissionGuard` chứ KHÔNG phải `AdminGuard`: `AdminGuard` chỉ
 * cho qua khi `vaiTro` viết hoa lên bằng `'ADMIN'`/`'SUPER_ADMIN'`, nhưng
 * `vaiTro` do `JwtGuard` nạp từ `app_user_roles.role` — là TÊN VAI TRÒ tự do
 * từng tenant tự đặt ("Quản trị hệ thống", "Quản lý"...). Trên production
 * không ai có đúng chuỗi "ADMIN" nên AdminGuard chặn cả HR thật. Vai trò
 * "Quản trị hệ thống" thì đã có sẵn đủ `/cham-cong/don-tu:xem|them|sua|xoa|xuat`
 * trong `phan_quyen.permissions` — đúng key FE dùng để gate màn hình Đơn từ.
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
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
  // findOne đòi quyền nên còn nhận nhầm 403. ─────────────────────────────

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

  // ── Quản trị — PermissionGuard + @Permissions trên từng route ───────────
  // Đặt guard ở CẤP ROUTE (không phải cấp class) đúng để ba route `cua-toi`
  // phía trên không dính phải nó.

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:xem')
  async findAll(@Query() query: DonChamCongFilter) {
    const data = await this.donChamCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.donChamCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:them')
  async create(@Body() body: CreateDonChamCongDto) {
    const data = await this.donChamCong_Service.create(body);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:sua')
  async update(@Param('id') id: string, @Body() body: UpdateDonChamCongDto) {
    const data = await this.donChamCong_Service.update(id, body);
    return { success: true, data };
  }

  // Duyệt/từ chối đơn là SỬA đơn đã có (`:sua`), không phải xoá — khác cách
  // xếp loại của `nhan-vien` (@Patch trạng thái ở đó là ngưng hoạt động hồ
  // sơ, hệ quả ngang xoá mềm).
  @Patch(':id/trang-thai')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:sua')
  async updateStatus(
    @Param('id') id: string,
    // CapNhatTrangThaiDto (thay vì inline type) là điều kiện BẮT BUỘC để
    // ValidationPipe toàn cục có metatype mà validate — inline type không có
    // class thật đứng sau nên pipe bỏ qua hoàn toàn, để lọt trangThai là
    // chuỗi bất kỳ hoặc thiếu hẳn (xem comment trong DTO).
    @Body() body: CapNhatTrangThaiDto,
    @Req() req: any,
  ) {
    // req.user LUÔN là người thực hiện thật (qua JwtGuard/PermissionGuard),
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
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/don-tu:xoa')
  async remove(@Param('id') id: string, @Req() req: any) {
    // req.user truyền xuống để hoanTraDaDung() (P3.8) ghi đúng tên người xoá
    // vào sổ quỹ khi đơn bị xoá là phep_nam đã da_duyet — xem
    // DonChamCong_Service.remove().
    await this.donChamCong_Service.remove(id, req.user);
    return { success: true, message: 'Xóa đơn chấm công thành công' };
  }
}
