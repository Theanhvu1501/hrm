import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum NganHangLoai {
  TIEN_MAT = 'TIEN_MAT',
  NGAN_HANG = 'NGAN_HANG',
}

@Entity('ngan_hang')
export class NganHang extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'enum', enum: NganHangLoai })
  loai: NganHangLoai;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  soDu: number;

  @Column({ nullable: true })
  nganHang: string;

  @Column({ nullable: true })
  soTaiKhoan: string;

  @Column({ nullable: true })
  chiNhanh: string;

  @Column({ nullable: true })
  chuTaiKhoan: string;

  @Column({ default: true })
  trangThai: boolean;

  @Column({ default: true })
  isActive: boolean;
}

export interface NganHangEntities {
  NganHang: typeof NganHang;
}

declare module '../entities' {
  interface Entities extends NganHangEntities {}
}
