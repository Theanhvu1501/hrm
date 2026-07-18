import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type GanTheo = 'SUAT_CHUAN' | 'DO_TUOI' | 'GOI_AN';

export interface ChiTietCongThuc {
  hangHoaMa: string;
  hangHoaTen: string;
  dinhLuong: number; // trên 1 suất ăn
  donViTinh?: string;
  cachXuat: 'DINH_LUONG' | 'THEO_SUAT';
}

@Entity('cong_thuc_dinh_luong')
export class CongThucDinhLuong extends BaseEntity {
  @Column()
  code: string;

  @Column()
  ten: string;

  @Column({ default: 'SUAT_CHUAN' })
  ganTheo: GanTheo;

  @Column({ nullable: true })
  doiTuongMa: string;

  @Column({ type: 'json', default: [] })
  chiTiet: ChiTietCongThuc[];

  @Column({ default: true })
  isActive: boolean;
}

export interface CongThucDinhLuongEntities {
  CongThucDinhLuong: typeof CongThucDinhLuong;
}

declare module '../entities' {
  interface Entities extends CongThucDinhLuongEntities {}
}
