import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtGuard } from '@app/auth';
import { DinhKem_Service } from './dinh-kem.service';
import { GanDinhKemDto, TaiDinhKemDto, TimDinhKemDto } from './dto';

/**
 * Quyền của một tệp đính kèm là quyền của MÀN HÌNH chủ nó (hồ sơ NV, hợp
 * đồng…), mà màn hình đó chỉ biết được lúc chạy qua tham số `doiTuong`. Vì
 * thế không dùng `@Permissions(...)` tĩnh được — kiểm tay bằng
 * `req.user.permissions` (JwtGuard đã nạp sẵn, xem `jwt.guard.ts`).
 *
 * `doiTuong` KHÔNG được ghép thẳng vào chuỗi quyền: làm vậy là để client tự
 * chọn quyền nào sẽ được kiểm (`doiTuong = 'x:xem'`). Nó phải tra qua bảng
 * `MAN_HINH` dưới đây, không khớp thì từ chối.
 */
const MAN_HINH: Record<string, string> = {
  nhan_vien: '/nhan-su/ho-so-nhan-vien',
  hop_dong: '/nhan-su/hop-dong-lao-dong',
  qua_trinh_cong_tac: '/nhan-su/qua-trinh-cong-tac',
  thoi_viec: '/nhan-su/thoi-viec',
};

function kiemQuyen(user: any, doiTuong: string, hanhDong: string): void {
  const perms: string[] = user?.permissions ?? [];
  if (user?.isSuperAdmin || perms.includes('*')) return;
  const man = MAN_HINH[doiTuong];
  if (!man) throw new ForbiddenException('Đối tượng đính kèm không hợp lệ');
  if (!perms.includes(`${man}:${hanhDong}`)) {
    throw new ForbiddenException(`Bạn không có quyền ${man}:${hanhDong}`);
  }
}

@Controller('dinh-kem')
@UseGuards(JwtGuard)
export class DinhKem_Controller {
  constructor(private readonly service: DinhKem_Service) {}

  @Get()
  async danhSach(@Query() q: TimDinhKemDto, @Req() req: any) {
    kiemQuyen(req.user, q.doiTuong, 'xem');
    const data = await this.service.danhSach(q);
    return { success: true, data };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async tai(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: TaiDinhKemDto,
    @Req() req: any,
  ) {
    kiemQuyen(req.user, dto.doiTuong, 'sua');
    const data = await this.service.tai(file, dto, {
      tenantId: req.user.tenantId,
      userId: req.user.id,
    });
    return { success: true, data };
  }

  /**
   * Tải file về. Trả `inline` để ảnh/PDF xem thẳng trong tab mới; tên file
   * đi kèm dạng RFC 5987 vì tên tiếng Việt có dấu.
   */
  @Get(':id/tep')
  async tep(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const dk = await this.service.mot(id);
    kiemQuyen(req.user, dk.doiTuong, 'xem');
    const { stream } = await this.service.stream(id, req.user.tenantId);
    res.setHeader('Content-Type', dk.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(dk.tenFile)}`,
    );
    stream.pipe(res);
  }

  @Patch('gan')
  async gan(@Body() dto: GanDinhKemDto, @Req() req: any) {
    kiemQuyen(req.user, dto.doiTuong, 'sua');
    const soDong = await this.service.ganLai(
      dto.doiTuong,
      dto.tuId,
      dto.sangId,
    );
    return { success: true, data: { soDong } };
  }

  @Delete(':id')
  async xoa(@Param('id') id: string, @Req() req: any) {
    const dk = await this.service.mot(id);
    kiemQuyen(req.user, dk.doiTuong, 'sua');
    await this.service.xoa(id);
    return { success: true };
  }
}
