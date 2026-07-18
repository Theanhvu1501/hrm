import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type TinhChatVatTu = 'TAI_SAN' | 'HANG_HOA' | 'NGUYEN_LIEU';

@Entity('hang_hoa_vat_tu')
export class HangHoaVatTu extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  tinhChat: TinhChatVatTu;

  @Column({ nullable: true })
  donViTinhMa: string;

  @Column({ nullable: true })
  donViTinhTen: string;

  @Column({ nullable: true })
  nhomVatTuMa: string;

  @Column({ nullable: true })
  nhomVatTuTen: string;

  @Column({ nullable: true })
  quyCach: string;

  @Column({ nullable: true })
  tkKho: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  donGia: number;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'DON_VI' })
  cachXuat: 'DINH_LUONG' | 'THEO_SUAT' | 'DON_VI';
}

export interface HangHoaVatTuEntities {
  HangHoaVatTu: typeof HangHoaVatTu;
}

declare module '../entities' {
  interface Entities extends HangHoaVatTuEntities {}
}
