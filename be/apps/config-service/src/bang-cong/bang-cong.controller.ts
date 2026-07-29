import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BangCong_Service } from './bang-cong.service';
import type { BangCongFilter } from './bang-cong.service';
import { UpdateTimesheetDto, ThangDto, SetDayDto } from './dto';
import { KY_HIEU_CHAM_CONG } from './cham-cong-ky-hieu';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * Bảng công là bảng tính lương: `generate()` tổng hợp bản ghi chấm công +
 * đơn từ thành số công/số giờ OT của từng người, `setDay()` sửa tay một ô,
 * `finalize()` chốt tháng. Trước bản vá này controller chỉ có `JwtGuard` —
 * MỌI tài khoản đăng nhập đọc được bảng công toàn công ty và sửa được số
 * công của bất kỳ ai.
 *
 * Hàng rào là `PermissionGuard` + `@Permissions('/cham-cong/bang-cong:...')`,
 * cùng khuôn với các module chấm công đã siết ở 67979dd (xem chú thích dài ở
 * `ngay-le.controller.ts` về lý do KHÔNG dùng `AdminGuard` lẫn `@Roles`).
 *
 * Không route nào ở đây là tự phục vụ: màn hình `/toi/bang-cong` của nhân
 * viên hiện là `ComingSoonPage` (`fe/src/App.tsx`), không gọi API nào. Khi
 * nào làm màn hình đó thật thì thêm route `cua-toi` riêng khoá phạm vi bằng
 * `employeeId` suy từ token — KHÔNG nới quyền của các route dưới đây.
 */
@Controller('bang-cong')
@UseGuards(JwtGuard)
export class BangCong_Controller {
  constructor(private readonly bangCong_Service: BangCong_Service) {}

  // Danh mục ký hiệu là hằng số trong mã nguồn, không phải dữ liệu công ty —
  // nhưng vẫn gắn `:xem` như mọi route GET khác: nó chỉ có ích khi đọc được
  // bảng công, và một ngoại lệ "vô hại" ở đây là một dòng người sau phải cân
  // nhắc lại mỗi lần rà quyền.
  @Get('ky-hieu')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:xem')
  async kyHieu() {
    return { success: true, data: KY_HIEU_CHAM_CONG };
  }

  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:xem')
  async findAll(@Query() query: BangCongFilter) {
    const data = await this.bangCong_Service.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:xem')
  async findOne(@Param('id') id: string) {
    const data = await this.bangCong_Service.findOne(id);
    return { success: true, data };
  }

  @Post('generate')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:them')
  async generate(@Body() body: ThangDto) {
    const data = await this.bangCong_Service.generate(body.thang);
    return { success: true, data };
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:sua')
  async update(@Param('id') id: string, @Body() body: UpdateTimesheetDto) {
    const data = await this.bangCong_Service.update(id, body);
    return { success: true, data };
  }

  @Patch(':id/ngay')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:sua')
  async setDay(@Param('id') id: string, @Body() body: SetDayDto) {
    const data = await this.bangCong_Service.setDay(id, body);
    return { success: true, data };
  }

  // `finalize` (khoá) và `mo-lai` (mở khoá) là một CẶP — spec §10 giao cả hai
  // cho `:sua`. Trước bản vá này `finalize` còn gắn `:them`, nên một vai trò
  // chỉ có `:sua` (không có `:them`) khoá được tháng công qua `mo-lai` nhưng
  // không tự mở lại được chính tháng mình vừa khoá.
  @Post('finalize')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:sua')
  async finalize(@Body() body: ThangDto) {
    const data = await this.bangCong_Service.finalize(body.thang);
    return { success: true, data };
  }

  // Route tên cố định phải khai TRƯỚC route dùng `:id` — nếu không NestJS
  // khớp chuỗi "mo-lai" thành tham số `:id` của route khác cùng động từ HTTP.
  @Post('mo-lai')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:sua')
  async moLai(@Body() body: ThangDto) {
    const soDong = await this.bangCong_Service.moLai(body.thang);
    return { success: true, data: { soDong } };
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/bang-cong:xoa')
  async remove(@Param('id') id: string) {
    await this.bangCong_Service.remove(id);
    return { success: true, message: 'Xóa bảng công thành công' };
  }
}
