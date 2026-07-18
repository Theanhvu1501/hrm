import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type PhamViDinhMuc = 'LOP' | 'DO_TUOI' | 'GOI_AN' | 'CHUNG';

@Entity('dinh_muc_tien_an')
export class DinhMucTienAn extends BaseEntity {
  @Column()
  code: string;

  @Column()
  ten: string;

  @Column({ default: 'CHUNG' })
  phamVi: PhamViDinhMuc;

  @Column({ nullable: true })
  doiTuongMa: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  mucTien: number;

  @Column({ nullable: true })
  hieuLucTu: Date;

  @Column({ nullable: true })
  hieuLucDen: Date;

  @Column({ default: true })
  isActive: boolean;
}

export interface DinhMucTienAnEntities {
  DinhMucTienAn: typeof DinhMucTienAn;
}

declare module '../entities' {
  interface Entities extends DinhMucTienAnEntities {}
}
