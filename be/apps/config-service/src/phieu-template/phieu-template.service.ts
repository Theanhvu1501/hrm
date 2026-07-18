import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhieuTemplate, LoaiPhieuTemplate } from '@app/entities';

@Injectable()
export class PhieuTemplate_Service {
  constructor(
    @InjectRepository(PhieuTemplate)
    private readonly repo: Repository<PhieuTemplate>,
  ) {}

  /** Lấy mẫu in theo loại (tenant auto-scope qua TenantProxy). null nếu chưa cấu hình. */
  async findByLoai(loai: string): Promise<PhieuTemplate | null> {
    return this.repo.findOne({ where: { loai: loai as LoaiPhieuTemplate } });
  }

  /** Upsert mẫu in cho 1 loại — 1 bản/tenant/loại. */
  async upsert(loai: string, html: string): Promise<PhieuTemplate> {
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
    const tpl = await this.repo.findOne({
      where: { loai: loai as LoaiPhieuTemplate },
    });
    if (tpl) await this.repo.remove(tpl);
  }
}
