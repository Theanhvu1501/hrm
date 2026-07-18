import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Phân loại chứng từ dùng để định tuyến phiếu thu/chi/nhật ký chung. */
export type PhanLoaiChungTu = 'THU' | 'CHI' | 'KHAC';

@Entity('loai_chung_tu')
export class LoaiChungTuMaster extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  // THU -> Phiếu thu, CHI -> Phiếu chi, KHAC -> chỉ Nhật ký chung (mua/bán chịu...)
  @Column({ default: 'KHAC' })
  phanLoai: PhanLoaiChungTu;

  @Column({ default: true })
  isActive: boolean;
}

export interface LoaiChungTuMasterEntities {
  LoaiChungTuMaster: typeof LoaiChungTuMaster;
}

declare module '../entities' {
  interface Entities extends LoaiChungTuMasterEntities {}
}
