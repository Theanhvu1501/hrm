import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type TaiLieuCategory = 'bieu-mau' | 'chinh-sach' | 'huong-dan';
export type TaiLieuType = 'file' | 'youtube';

/**
 * Tài liệu trong Thư viện tài liệu (Biểu mẫu / Chính sách / Hướng dẫn).
 * Tenant-aware qua BaseEntity (tenantId) + TenantProxy của DatabaseModule.
 * type='file' → lưu file qua StorageService (GridFS), giữ storageKey.
 * type='youtube' → chỉ lưu link + id video.
 */
@Entity('tai_lieu')
export class TaiLieu extends BaseEntity {
  @Column()
  @Index()
  category: TaiLieuCategory;

  @Column()
  title: string;

  @Column({ nullable: true })
  moTa?: string;

  @Column()
  type: TaiLieuType;

  @Column({ nullable: true })
  storageKey?: string;

  @Column({ nullable: true })
  tenFile?: string;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ nullable: true })
  size?: number;

  @Column({ nullable: true })
  youtubeUrl?: string;

  @Column({ nullable: true })
  youtubeId?: string;

  @Column({ nullable: true })
  createdBy?: string;
}

export interface TaiLieuEntities {
  TaiLieu: typeof TaiLieu;
}

declare module '../entities' {
  interface Entities extends TaiLieuEntities {}
}
