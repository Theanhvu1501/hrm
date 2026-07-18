import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('so_du_dau_ky')
export class SoDuDauKy extends BaseEntity {
  @Column()
  maTaiKhoan: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  duNo: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  duCo: number;

  @Column({ type: 'timestamp', nullable: true })
  ngayApDung: Date;

  @Column({ nullable: true })
  chiTietType?: string;

  @Column({ nullable: true })
  chiTietId?: string;

  @Column({ nullable: true })
  chiTietMa?: string;

  @Column({ nullable: true })
  chiTietTen?: string;

  @Column({ nullable: true })
  nganHang?: string;
}

export interface SoDuDauKyEntities {
  SoDuDauKy: typeof SoDuDauKy;
}

declare module '../entities' {
  interface Entities extends SoDuDauKyEntities {}
}
