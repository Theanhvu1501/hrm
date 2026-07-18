import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export interface QuyetToanHD {
  so?: string;
  ngay?: Date;
  giaTri?: number;
}

export interface BaoHanhTheoDoi {
  giaTri?: number;
  soNgay?: number;
  ngayGiaiToaBL?: Date;
  trangThai?: string;
}

export interface DotThanhToan {
  tiLe?: number;
  soTien?: number;
}

export interface DotHoaDon {
  soTien?: number;
}

export interface TinhTrangHoSo {
  hd?: boolean;
  nt1?: boolean;
  nt2?: boolean;
  ntSuDung?: boolean;
  thanhLy?: boolean;
  namQuyetToan?: number;
}

/** Theo dõi hợp đồng (1:1 với hop_dong qua hopDongId) — sheet "Theo dõi HĐ". */
@Entity('theo_doi_hop_dong')
export class TheoDoiHopDong extends BaseEntity {
  @Column()
  hopDongId: string;

  @Column({ nullable: true })
  phuTrachHoSo?: string;

  @Column({ nullable: true })
  trangThaiHoSo?: string;

  @Column({ type: 'json', nullable: true })
  quyetToan?: QuyetToanHD;

  @Column({ type: 'json', nullable: true })
  baoHanhTheoDoi?: BaoHanhTheoDoi;

  @Column({ type: 'decimal', nullable: true })
  giamTru?: number;

  @Column({ type: 'json', default: [] })
  dotThanhToan: DotThanhToan[];

  @Column({ type: 'json', default: [] })
  dotHoaDon: DotHoaDon[];

  @Column({ type: 'json', nullable: true })
  tinhTrangHoSo?: TinhTrangHoSo;

  @Column({ nullable: true })
  ghiChu?: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface TheoDoiHopDongEntities {
  TheoDoiHopDong: typeof TheoDoiHopDong;
}

declare module '../entities' {
  interface Entities extends TheoDoiHopDongEntities {}
}
