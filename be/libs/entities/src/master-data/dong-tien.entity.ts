import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum DongTienLoai {
  KINH_DOANH = 'KINH_DOANH',
  DAU_TU = 'DAU_TU',
  TAI_CHINH = 'TAI_CHINH',
}

@Entity('dong_tien')
export class DongTien extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'enum', enum: DongTienLoai })
  loai: DongTienLoai;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface DongTienEntities {
  DongTien: typeof DongTien;
}

declare module '../entities' {
  interface Entities extends DongTienEntities {}
}
