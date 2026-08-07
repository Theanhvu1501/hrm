import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThietBiChamCong_Service } from './thiet-bi-cham-cong.service';
import type { ThietBiFilter } from './thiet-bi-cham-cong.service';
import { NhanVien_Service } from '../nhan-vien/nhan-vien.service';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Đây là cơ chế chống chấm công hộ của cả hệ thống: mỗi nhân viên chỉ chấm
 * được từ đúng một thiết bị đã được HR duyệt. `deviceId` do client sinh nên
 * toàn bộ độ an toàn nằm ở luật "thiết bị lạ phải được HR duyệt" — nghĩa là
 * nằm ở hàng rào phân quyền của chính controller này.
 *
 * Hàng rào là `PermissionGuard` + `@Permissions('/cham-cong/thiet-bi:...')`,
 * KHÔNG phải `AdminGuard`: `AdminGuard` chỉ cho qua khi `vaiTro` viết hoa lên
 * bằng `'ADMIN'`/`'SUPER_ADMIN'`, nhưng `vaiTro` do `JwtGuard` nạp từ
 * `app_user_roles.role` — là TÊN VAI TRÒ tự do từng tenant tự đặt ("Quản trị
 * hệ thống", "Quản lý"...). Trên production không ai có đúng chuỗi "ADMIN"
 * nên AdminGuard chặn cả HR thật, không ai duyệt được thiết bị.
 * KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
 *
 * LƯU Ý dữ liệu: module `/cham-cong/thiet-bi` được thêm vào catalog SAU khi
 * các hàng `phan_quyen` trên production được tạo, nên chúng thiếu đúng bộ 5
 * quyền này. Phải chạy `ops/grant-quyen-module-moi.ts` cùng lần deploy, nếu
 * không màn hình Thiết bị vẫn 403 với mọi người.
 */
@Controller('thiet-bi-cham-cong')
@UseGuards(JwtGuard)
export class ThietBiChamCong_Controller {
  constructor(
    private readonly thietBi_Service: ThietBiChamCong_Service,
    private readonly nhanVien_Service: NhanVien_Service,
  ) {}

  /**
   * Vết audit của thao tác bảo mật quan trọng nhất trong hệ thống không được
   * phép là chuỗi rỗng — không biết ai duyệt thì không có gì để truy vết.
   */
  private nguoiThucHien(req: any): string {
    const email = String(req?.user?.email ?? '').trim();
    if (email) return email;
    const id = String(req?.user?.id ?? '').trim();
    if (id) return id;
    throw new BadRequestException(
      'Không xác định được người thực hiện thao tác thiết bị chấm công',
    );
  }

  /**
   * Tự phục vụ — route DUY NHẤT trong controller này chỉ cần `JwtGuard`:
   * mọi nhân viên (không riêng gì HR) đều phải xem được danh sách thiết bị
   * của CHÍNH MÌNH để biết máy đang chờ duyệt hay đã được duyệt. Dữ liệu đã
   * được lọc theo nhân viên đang đăng nhập nên không lộ thiết bị của người
   * khác. Toàn bộ route còn lại đều gắn thêm `PermissionGuard`.
   *
   * Phải đặt TRƯỚC các route có tham số (":id"), nếu không NestJS sẽ
   * khớp "cua-toi" thành :id.
   */
  @Get('cua-toi')
  async cuaToi(@Req() req: any) {
    const emp = await this.nhanVien_Service.resolveEmployeeFromUser(req.user);
    const data = await this.thietBi_Service.cuaToi(emp);
    return { success: true, data };
  }

  // Danh sách toàn tenant chứa employeeName/employeeCode/userAgent của mọi
  // nhân viên → chỉ quản trị được đọc.
  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/thiet-bi:xem')
  async findAll(@Query() query: ThietBiFilter) {
    const data = await this.thietBi_Service.findAll(query);
    return { success: true, data };
  }

  // Ba route duyệt/từ chối/thu hồi dưới đây đều là `@Post` nên nhận quyền
  // `:them` theo đúng bảng ánh xạ động-từ→quyền dùng chung cho cả 7 controller
  // (@Get→:xem, @Post→:them, @Put→:sua, @Delete/@Patch đổi trạng thái→:xoa).
  // Cố ý KHÔNG tự chế `:sua` cho riêng module này: quyền là dữ liệu có sẵn
  // trên production, lệch khỏi bảng là lệch khỏi thứ FE và script cấp quyền
  // đang dựa vào.
  //
  // Nếu nhân viên tự duyệt được máy của chính mình thì luật chống chấm hộ
  // biến mất hoàn toàn: mở app trên máy đồng nghiệp → tự tạo dòng cho_duyet
  // → tự duyệt → đồng nghiệp chấm hộ hợp lệ.
  @Post(':id/duyet')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/thiet-bi:them')
  async duyet(@Param('id') id: string, @Req() req: any) {
    const data = await this.thietBi_Service.duyet(id, this.nguoiThucHien(req));
    return { success: true, data };
  }

  @Post(':id/tu-choi')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/thiet-bi:them')
  async tuChoi(@Param('id') id: string, @Req() req: any) {
    const data = await this.thietBi_Service.tuChoi(id, this.nguoiThucHien(req));
    return { success: true, data };
  }

  // Mở khoá máy đã bị thu hồi/từ chối. Route RIÊNG chứ không nới lỏng
  // `duyet()`: `duyet()` giữ luật "chỉ nhận cho_duyet", còn đây là đường duy
  // nhất hồi sinh một thiết bị nên vết audit tách bạch được "duyệt máy mới"
  // với "mở lại máy từng bị khoá". Cùng quyền `:them` với duyệt — cả hai đều
  // là mở khoá chấm công, tách quyền mới chỉ thêm một bước cấp quyền dễ quên.
  @Post(':id/kich-hoat-lai')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/thiet-bi:them')
  async kichHoatLai(@Param('id') id: string, @Req() req: any) {
    const data = await this.thietBi_Service.kichHoatLai(
      id,
      this.nguoiThucHien(req),
    );
    return { success: true, data };
  }

  // Thu hồi là thao tác khoá chấm công — để hở thì bất kỳ ai cũng khoá được
  // cả công ty bằng vài request.
  @Post(':id/thu-hoi')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/thiet-bi:them')
  async thuHoi(
    @Param('id') id: string,
    @Body() body: { lyDo?: string },
    @Req() req: any,
  ) {
    const data = await this.thietBi_Service.thuHoi(
      id,
      this.nguoiThucHien(req),
      body?.lyDo,
    );
    return { success: true, data };
  }
}
