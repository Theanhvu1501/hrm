import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type LoaiCongNo = 'PHAI_THU' | 'PHAI_TRA';
export type TrangThaiCongNo = 'CHUA_THU' | 'DA_THU_MOT_PHAN' | 'DA_THU_DU';

@Entity('cong_no')
export class CongNo extends BaseEntity {
  @Column()
  loai: LoaiCongNo;

  @Column()
  doiTuongId: string;

  @Column({ nullable: true })
  doiTuongTen?: string;

  @Column({ nullable: true })
  chungTuId?: string;

  @Column({ default: 0 })
  soTienGoc: number;

  @Column({ default: 0 })
  daThu: number;

  @Column({ default: 0 })
  conLai: number;

  @Column({ nullable: true })
  ngayPhatSinh?: Date;

  @Column({ nullable: true })
  hanThanhToan?: Date;

  @Column({ default: 'CHUA_THU' })
  trangThai: TrangThaiCongNo;
}

export interface CongNoEntities {
  CongNo: typeof CongNo;
}

declare module '../entities' {
  interface Entities extends CongNoEntities {}
}
