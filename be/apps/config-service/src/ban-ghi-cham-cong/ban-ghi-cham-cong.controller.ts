import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { BanGhiChamCong_Service } from './ban-ghi-cham-cong.service';
import type { BanGhiFilter } from './ban-ghi-cham-cong.service';
import { ChamCongDto, HrNhapChamCongDto } from './dto';
import { JwtGuard, PermissionGuard, Permissions } from '@app/auth';

/**
 * IP dùng để đối chiếu địa điểm chấm công `loai='wifi'`.
 *
 * KHÔNG đọc thẳng header `X-Forwarded-For`: đó là header client tự đặt được,
 * nên nhân viên ngồi ở nhà chỉ cần gửi `X-Forwarded-For: <ip văn phòng>` là
 * được ghi nhận `ngoaiVung: false` — vô hiệu hoá hoàn toàn cơ chế chống chấm
 * công hộ bằng wifi.
 *
 * `req.ip` của Express chỉ đọc `X-Forwarded-For` đúng theo số chặng proxy đã
 * khai bằng `app.set('trust proxy', ...)` trong `main.ts`; phần client tự bịa
 * bị bỏ qua. Hiện `main.ts` khai `false` (xem chú thích ở đó) nên `req.ip`
 * chính là địa chỉ socket — an toàn, không giả mạo được.
 *
 * Không chuẩn hoá ở đây: `BanGhiChamCong_Service` đã gọi `chuanHoaIp()`.
 */
function layIp(req: Request): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

@Controller('ban-ghi-cham-cong')
@UseGuards(JwtGuard)
export class BanGhiChamCong_Controller {
  constructor(private readonly banGhi_Service: BanGhiChamCong_Service) {}

  // ── Tự phục vụ: CHỈ JwtGuard, không PermissionGuard ─────────────────
  // Mọi nhân viên đều phải chấm công được — bắt HR gán quyền cho từng
  // người sẽ khiến người mới không chấm được vào đúng ngày đầu tiên.
  // Kiểm soát nằm ở phạm vi dữ liệu: employeeId luôn suy từ req.user,
  // KHÔNG BAO GIỜ đọc từ body.

  @Post('check-in')
  async checkIn(@Body() body: ChamCongDto, @Req() req: any) {
    const data = await this.banGhi_Service.checkIn(
      req.user,
      body,
      layIp(req),
      req.headers['user-agent'],
    );
    return { success: true, data };
  }

  @Post('check-out')
  async checkOut(@Body() body: ChamCongDto, @Req() req: any) {
    const data = await this.banGhi_Service.checkOut(
      req.user,
      body,
      layIp(req),
      req.headers['user-agent'],
    );
    return { success: true, data };
  }

  /** Đặt TRƯỚC @Get() để không bị nuốt thành query rỗng. */
  @Get('hom-nay')
  async homNay(@Req() req: any) {
    const data = await this.banGhi_Service.homNay(req.user);
    return { success: true, data };
  }

  /**
   * Lịch sử chấm công của CHÍNH mình, cho lịch tuần trên màn hình nhân viên.
   *
   * Chỉ `JwtGuard` như `hom-nay`: mọi nhân viên đều phải xem được tuần của
   * mình mà không cần HR gán quyền. Phạm vi khoá bằng employeeId suy từ
   * token trong service — `employeeId` gửi kèm query bị bỏ qua hoàn toàn.
   *
   * Phải đặt TRƯỚC `@Get()` để không bị nuốt thành query rỗng.
   */
  @Get('cua-toi')
  async cuaToi(
    @Query() query: { tuNgay?: string; denNgay?: string },
    @Req() req: any,
  ) {
    const data = await this.banGhi_Service.cuaToi(
      req.user,
      query.tuNgay,
      query.denNgay,
    );
    return { success: true, data };
  }

  /**
   * Ngày nghỉ theo lịch (và ngày lễ) của CHÍNH mình trong khoảng — để lịch
   * tuần đánh dấu ngày không phải chấm công, thay vì để chúng xám lẫn với
   * ngày quên chấm.
   *
   * Tự phục vụ như `cua-toi`: phạm vi khoá bằng employeeId suy từ token.
   * Cũng phải đặt TRƯỚC `@Get()` để không bị nuốt thành query rỗng.
   */
  @Get('cua-toi/ngay-nghi')
  async ngayNghiCuaToi(
    @Query() query: { tuNgay?: string; denNgay?: string },
    @Req() req: any,
  ) {
    const data = await this.banGhi_Service.ngayNghiCuaToi(
      req.user,
      query.tuNgay,
      query.denNgay,
    );
    return { success: true, data };
  }

  // ── Quản trị ────────────────────────────────────────────────────────
  // Hàng rào là `PermissionGuard` + `@Permissions('/cham-cong/ban-ghi:...')`,
  // KHÔNG phải `AdminGuard`: `AdminGuard` chỉ cho qua khi `vaiTro` viết hoa
  // lên bằng 'ADMIN'/'SUPER_ADMIN', nhưng `vaiTro` do `JwtGuard` nạp từ
  // `app_user_roles.role` — là TÊN VAI TRÒ tự do từng tenant tự đặt ("Quản
  // trị hệ thống", "Quản lý"...). Trên production không ai có đúng chuỗi
  // "ADMIN" nên AdminGuard chặn cả HR thật.
  // KHÔNG dùng `@Roles(...)`: `RoleGuard` trong repo hiện chỉ `return true`.
  //
  // LƯU Ý dữ liệu: module `/cham-cong/ban-ghi` được thêm vào catalog SAU khi
  // các hàng `phan_quyen` trên production được tạo, nên chúng thiếu đúng bộ 5
  // quyền này. Phải chạy `ops/grant-quyen-module-moi.ts` cùng lần deploy, nếu
  // không màn hình Bản ghi chấm công vẫn 403 với mọi người.

  /**
   * Tra cứu toàn tenant: trả bản ghi chấm công của MỌI nhân viên (giờ vào/ra,
   * vị trí, cờ ngoài vùng). Để hở thì bất kỳ nhân viên nào cũng đọc được lịch
   * đi lại của cả công ty.
   */
  @Get()
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ban-ghi:xem')
  async findAll(@Query() query: BanGhiFilter) {
    const data = await this.banGhi_Service.findAll(query);
    return { success: true, data };
  }

  /**
   * Nhập bù công CHO NGƯỜI KHÁC (`employeeId` lấy từ body). Không qua kiểm
   * tra thiết bị lẫn đối chiếu vị trí — để hở thì mọi nhân viên đều tự chèn
   * được bản ghi công cho chính mình hoặc cho đồng nghiệp.
   */
  @Post('hr-nhap')
  @UseGuards(PermissionGuard)
  @Permissions('/cham-cong/ban-ghi:them')
  async hrNhap(@Body() body: HrNhapChamCongDto, @Req() req: any) {
    const data = await this.banGhi_Service.hrNhap(
      body,
      this.nguoiThucHien(req),
    );
    return { success: true, data };
  }

  /**
   * Vết audit của thao tác chèn dữ liệu công không được phép là chuỗi rỗng —
   * không biết ai nhập thì bản ghi công không có gì để truy vết. Giống hệt
   * cách `ThietBiChamCong_Controller` xử lý.
   */
  private nguoiThucHien(req: any): string {
    const email = String(req?.user?.email ?? '').trim();
    if (email) return email;
    const id = String(req?.user?.id ?? '').trim();
    if (id) return id;
    throw new BadRequestException(
      'Không xác định được người thực hiện thao tác nhập bù chấm công',
    );
  }
}
