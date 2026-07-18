import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type LoaiPhieuTemplate = 'PHIEU_THU' | 'PHIEU_CHI';

/**
 * Mẫu in (HTML) cho phiếu thu/chi — 1 bản/tenant/loại. Có placeholder {{...}}.
 * Rỗng (chưa cấu hình) → FE dùng mẫu mặc định dựng sẵn.
 */
@Entity('phieu_template')
export class PhieuTemplate extends BaseEntity {
  @Column()
  loai: LoaiPhieuTemplate;

  @Column()
  html: string;
}

export interface PhieuTemplateEntities {
  PhieuTemplate: typeof PhieuTemplate;
}

declare module '../entities' {
  interface Entities extends PhieuTemplateEntities {}
}
