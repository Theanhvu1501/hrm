import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('voucher_sequences')
export class VoucherSequence extends BaseEntity {
  /**
   * Khoá đếm:
   * - Số cũ (fallback PT/PC/NK): chứa loai (PHIEU_THU/PHIEU_CHI/KHAC), không có `thang`.
   * - Số mới (theo mã loại chứng từ): chứa mã loại chứng từ + `thang` (đếm theo từng tháng).
   */
  @Column()
  loai: string;

  @Column()
  year: number;

  /** Tháng (1-12). Chỉ có ở dải số mới đếm theo (mã, năm, tháng). */
  @Column({ nullable: true })
  thang?: number;

  @Column({ default: 0 })
  lastSequence: number;
}

export interface VoucherSequenceEntities {
  VoucherSequence: typeof VoucherSequence;
}

declare module '../entities' {
  interface Entities extends VoucherSequenceEntities {}
}
