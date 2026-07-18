import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('nhom_khuyen_mai')
export class NhomKhuyenMai extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomKhuyenMaiEntities {
  NhomKhuyenMai: typeof NhomKhuyenMai;
}

declare module '../entities' {
  interface Entities extends NhomKhuyenMaiEntities {}
}
