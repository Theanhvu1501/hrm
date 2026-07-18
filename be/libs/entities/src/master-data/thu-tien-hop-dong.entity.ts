import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Sổ thu tiền theo hợp đồng (sheet "Thu tiền"). */
@Entity('thu_tien_hop_dong')
export class ThuTienHopDong extends BaseEntity {
  @Column({ nullable: true })
  nam?: number;

  @Column()
  hopDongId: string;

  @Column({ nullable: true })
  soHopDong?: string;

  @Column({ nullable: true })
  doiTuongId?: string;

  @Column({ nullable: true })
  tenKhachHang?: string;

  @Column({ nullable: true })
  noiDung?: string;

  @Column({ type: 'decimal', default: 0 })
  soTien: number;

  @Column({ nullable: true })
  ngay?: Date;

  @Column({ nullable: true })
  lan?: number;

  @Column({ nullable: true })
  ghiChu?: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface ThuTienHopDongEntities {
  ThuTienHopDong: typeof ThuTienHopDong;
}

declare module '../entities' {
  interface Entities extends ThuTienHopDongEntities {}
}
