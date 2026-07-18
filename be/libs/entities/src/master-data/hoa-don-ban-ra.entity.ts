import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Sổ hóa đơn bán ra theo hợp đồng (sheet "HĐ BÁN RA"). */
@Entity('hoa_don_ban_ra')
export class HoaDonBanRa extends BaseEntity {
  @Column({ nullable: true })
  soHoaDon?: string;

  @Column({ nullable: true })
  ngay?: Date;

  @Column({ nullable: true })
  noiDung?: string;

  @Column()
  hopDongId: string;

  @Column({ nullable: true })
  soHopDong?: string;

  @Column({ nullable: true })
  tenCongTrinh?: string;

  @Column({ nullable: true })
  doiTuongId?: string;

  @Column({ nullable: true })
  donViMua?: string;

  @Column({ type: 'decimal', nullable: true })
  tienHang?: number;

  @Column({ type: 'decimal', nullable: true })
  tienThue?: number;

  @Column({ type: 'decimal', default: 0 })
  tong: number;

  @Column({ nullable: true })
  lan?: number;

  @Column({ nullable: true })
  nam?: number;

  @Column({ nullable: true })
  namHoaDon?: number;

  @Column({ default: true })
  isActive: boolean;
}

export interface HoaDonBanRaEntities {
  HoaDonBanRa: typeof HoaDonBanRa;
}

declare module '../entities' {
  interface Entities extends HoaDonBanRaEntities {}
}
