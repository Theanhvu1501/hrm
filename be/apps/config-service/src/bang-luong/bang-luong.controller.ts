import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BangLuong_Service } from './bang-luong.service';
import { CapNhatCauHinhLuongDto, CapNhatDongLuongDto, TongHopKyDto } from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Bảng lương đọc/ghi thu nhập thật của toàn bộ nhân viên — nhạy cảm hơn cả
 * bảng công. Hàng rào là `PermissionGuard` + `@Permissions('/luong/...')`,
 * cùng khuôn với `bang-cong.controller.ts`/`don-cham-cong.controller.ts`:
 * KHÔNG dùng `AdminGuard` (chỉ khớp khi `vaiTro` viết hoa đúng bằng
 * `'ADMIN'`/`'SUPER_ADMIN'`, nhưng `vaiTro` do `JwtGuard` nạp từ
 * `app_user_roles.role` — TÊN VAI TRÒ tự do từng tenant tự đặt, ví dụ "Quản
 * trị hệ thống"/"Quản lý"; trên production không ai có đúng chuỗi "ADMIN"
 * nên AdminGuard chặn cả HR thật). Cũng KHÔNG dùng `@Roles(...)`: `RoleGuard`
 * trong repo hiện chỉ `return true` (no-op), xem `be/libs/auth/src/guards/
 * role.guard.ts`. `PermissionGuard` thật sự kiểm `user.permissions` nạp từ
 * `phan_quyen.permissions` của vai trò — đúng khoá `/luong/bang-luong:...`
 * và `/luong/cau-hinh:...` mà `phan-quyen`/FE dùng để gate hai màn hình
 * Cấu hình lương và Bảng lương.
 *
 * Cấu hình lương (`cau-hinh`) tách quyền riêng (`/luong/cau-hinh:sua`) khỏi
 * quyền đọc/sửa dòng lương (`/luong/bang-luong:...`) vì đây là tham số ảnh
 * hưởng TOÀN BỘ kỳ lương (bậc thuế, khoản lương, tỷ lệ BHXH…) — phạm vi rủi
 * ro khác hẳn sửa một dòng lương của một nhân viên.
 */
@Controller('bang-luong')
@UseGuards(JwtGuard)
export class BangLuong_Controller {
  constructor(private readonly bangLuong_Service: BangLuong_Service) {}

  // Route có đoạn đường dẫn cố định (`cau-hinh`, `tong-hop`, `chot`,
  // `mo-lai`) PHẢI khai TRƯỚC route `:id` bên dưới — nếu không NestJS khớp
  // các chuỗi này thành `:id` (xem chú thích tương tự ở
  // `don-cham-cong.controller.ts`), ví dụ PATCH /bang-luong/chot sẽ bị route
  // `update(':id')` nuốt mất và gọi nhầm `capNhatDong('chot', ...)`.

  @Get('cau-hinh')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/cau-hinh:xem')
  async layCauHinh() {
    const data = await this.bangLuong_Service.layCauHinh();
    return { success: true, data };
  }

  /**
   * Số ĐƠN làm thêm đang tham chiếu từng loại ngày — màn Cấu hình lương dùng
   * để chặn xoá loại đang được dùng (P4.2b §6).
   *
   * Dùng lại `/luong/cau-hinh:xem` chứ không mở khoá quyền mới: đây là dữ liệu
   * phục vụ đúng màn Cấu hình lương, và thêm module quyền là thêm một bước
   * `ops/grant-quyen-module-moi.ts` bắt buộc lúc deploy — không đáng cho một
   * endpoint đếm.
   */
  @Get('dem-don-theo-loai-ot')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/cau-hinh:xem')
  async demDonTheoLoaiOt() {
    const data = await this.bangLuong_Service.demDonTheoLoaiOt();
    return { success: true, data };
  }

  @Put('cau-hinh')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/cau-hinh:sua')
  async capNhatCauHinh(@Body() body: CapNhatCauHinhLuongDto) {
    const data = await this.bangLuong_Service.capNhatCauHinh(body);
    return { success: true, data };
  }

  @Post('tong-hop')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:them')
  async tongHop(@Body() body: TongHopKyDto) {
    const data = await this.bangLuong_Service.tongHop(body.thang);
    return { success: true, data };
  }

  @Post('chot')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:sua')
  async chot(@Body() body: TongHopKyDto) {
    const data = await this.bangLuong_Service.chot(body.thang);
    return { success: true, data };
  }

  @Post('mo-lai')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:sua')
  async moLai(@Body() body: TongHopKyDto) {
    const data = await this.bangLuong_Service.moLai(body.thang);
    return { success: true, data };
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:xem')
  async danhSachDong(@Query('thang') thang: string) {
    const data = await this.bangLuong_Service.danhSachDong(thang);
    return { success: true, data };
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/luong/bang-luong:sua')
  async capNhatDong(@Param('id') id: string, @Body() body: CapNhatDongLuongDto) {
    const data = await this.bangLuong_Service.capNhatDong(id, body);
    return { success: true, data };
  }
}
