import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum TrangThaiHopDong {
  CHUA_CO_HD = 'CHUA_CO_HD',
  HD_CHUA_KY = 'HD_CHUA_KY',
  HD_PHOTO_SCAN = 'HD_PHOTO_SCAN',
  HD_GOC = 'HD_GOC',
}

export interface PhuLuc {
  giaTri?: number;
  ngayKy?: Date;
}

export interface DieuKhoanThanhToan {
  tamUng?: number;
  thanhToanGiaiDoan?: number;
  quyetToan?: number;
}

export interface BaoHanh {
  giaTri?: number;
  thoiGian?: string;
  hinhThuc?: string;
}

export interface TienDoThiCong {
  soNgay?: number;
  tuNgay?: Date;
  denNgay?: Date;
}

@Entity('hop_dong')
export class HopDong extends BaseEntity {
  @Column()
  soHopDong: string;

  @Column()
  tenCongTrinh: string;

  @Column({ nullable: true })
  nam?: number;

  @Column({ type: 'decimal', nullable: true })
  giaTriSauThue?: number;

  @Column({ nullable: true })
  ngayKy?: Date;

  @Column({ type: 'json', nullable: true })
  phuLuc1?: PhuLuc;

  @Column({ type: 'json', nullable: true })
  phuLuc2?: PhuLuc;

  @Column({ nullable: true })
  doiTuongId?: string;

  @Column({ nullable: true })
  nguoiKy?: string;

  @Column({ nullable: true })
  chucVu?: string;

  @Column({ nullable: true })
  nguoiGiaoDich?: string;

  @Column({ type: 'json', nullable: true })
  dieuKhoanThanhToan?: DieuKhoanThanhToan;

  @Column({ type: 'json', nullable: true })
  baoHanh?: BaoHanh;

  @Column({ type: 'json', nullable: true })
  tienDoThiCong?: TienDoThiCong;

  @Column({
    type: 'enum',
    enum: TrangThaiHopDong,
    default: TrangThaiHopDong.CHUA_CO_HD,
  })
  trangThai: TrangThaiHopDong;

  @Column({ nullable: true })
  soLuongLuu?: number;

  @Column({ default: true })
  isActive: boolean;
}

export interface HopDongEntities {
  HopDong: typeof HopDong;
}

declare module '../entities' {
  interface Entities extends HopDongEntities {}
}
