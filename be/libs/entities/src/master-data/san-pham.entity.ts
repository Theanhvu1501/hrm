import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('san_pham')
export class SanPham extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  donVi: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  giaBan: number;

  @Column({ nullable: true })
  nhom: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface SanPhamEntities {
  SanPham: typeof SanPham;
}

declare module '../entities' {
  interface Entities extends SanPhamEntities {}
}
