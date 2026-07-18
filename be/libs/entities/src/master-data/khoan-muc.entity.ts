import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum KhoanMucLoai {
  CHI_PHI = 'CHI_PHI',
  DOANH_THU = 'DOANH_THU',
}

@Entity('khoan_muc')
export class KhoanMuc extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'enum', enum: KhoanMucLoai })
  loai: KhoanMucLoai;

  @Column({ nullable: true })
  nhom: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface KhoanMucEntities {
  KhoanMuc: typeof KhoanMuc;
}

declare module '../entities' {
  interface Entities extends KhoanMucEntities {}
}
