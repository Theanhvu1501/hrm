import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhieuTemplate, LoaiPhieuTemplate } from '@app/entities';

/**
 * `HOP_DONG_LAO_DONG` KHÔNG được đi qua controller/service này — nó thuộc sở
 * hữu của `hop-dong.controller.ts` (gác bằng `PermissionGuard` theo quyền
 * chi tiết `/nhan-su/hop-dong-lao-dong:...` + sanitize bằng `sanitize-html`
 * ở cả lúc lưu lẫn lúc render). Controller NÀY vẫn dùng `AdminGuard` — một
 * guard THẬT SỰ hoạt động (xem chú thích tại entity) nhưng theo mô hình vai
 * trò thô (`vaiTro === 'Admin'`), không sanitize gì cả trước khi ghi `html`.
 * Nếu để lọt loai này qua đây, nó trở thành đường GHI THỨ HAI vào CÙNG một
 * bản ghi Mongo mà `getMauIn()`/`renderHopDong()` đọc — vô hiệu hoá mọi lớp
 * sanitize đã làm ở hop-dong module (review Critical 2). Chặn cứng ở tầng
 * service để dù ai đó có nối lại route cũng không thể lách qua.
 */
const LOAI_BI_CHAN: LoaiPhieuTemplate = 'HOP_DONG_LAO_DONG';

function assertKhongPhaiHopDong(loai: string): void {
  if (loai === LOAI_BI_CHAN) {
    throw new ForbiddenException(
      'Mẫu in hợp đồng lao động quản lý ở /config/hop-dong/mau-in, không dùng route này',
    );
  }
}

@Injectable()
export class PhieuTemplate_Service {
  constructor(
    @InjectRepository(PhieuTemplate)
    private readonly repo: Repository<PhieuTemplate>,
  ) {}

  /** Lấy mẫu in theo loại (tenant auto-scope qua TenantProxy). null nếu chưa cấu hình. */
  async findByLoai(loai: string): Promise<PhieuTemplate | null> {
    assertKhongPhaiHopDong(loai);
    return this.repo.findOne({ where: { loai: loai as LoaiPhieuTemplate } });
  }

  /** Upsert mẫu in cho 1 loại — 1 bản/tenant/loại. */
  async upsert(loai: string, html: string): Promise<PhieuTemplate> {
    assertKhongPhaiHopDong(loai);
    let tpl = await this.repo.findOne({
      where: { loai: loai as LoaiPhieuTemplate },
    });
    if (tpl) {
      tpl.html = html;
    } else {
      tpl = this.repo.create({ loai: loai as LoaiPhieuTemplate, html });
    }
    return this.repo.save(tpl);
  }

  /** Xoá mẫu in (về mặc định). */
  async remove(loai: string): Promise<void> {
    assertKhongPhaiHopDong(loai);
    const tpl = await this.repo.findOne({
      where: { loai: loai as LoaiPhieuTemplate },
    });
    if (tpl) await this.repo.remove(tpl);
  }
}
