import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum NhomKhoanMucLoai {
  CHI_PHI = 'CHI_PHI',
  DOANH_THU = 'DOANH_THU',
}

@Entity('nhom_khoan_muc')
export class NhomKhoanMuc extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'enum', enum: NhomKhoanMucLoai })
  loai: NhomKhoanMucLoai;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomKhoanMucEntities {
  NhomKhoanMuc: typeof NhomKhoanMuc;
}

declare module '../entities' {
  interface Entities extends NhomKhoanMucEntities {}
}
