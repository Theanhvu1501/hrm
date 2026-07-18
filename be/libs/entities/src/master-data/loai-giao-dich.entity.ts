import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('loai_giao_dich')
export class LoaiGiaoDich extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  moTa: string;

  // Mã Loại chứng từ liên kết — dùng để suy ra phiếu thu/chi/NKC khi tạo chứng từ
  @Column({ nullable: true })
  loaiChungTuMa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface LoaiGiaoDichEntities {
  LoaiGiaoDich: typeof LoaiGiaoDich;
}

declare module '../entities' {
  interface Entities extends LoaiGiaoDichEntities {}
}
