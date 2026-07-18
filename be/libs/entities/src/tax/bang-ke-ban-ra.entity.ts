import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('bang_ke_ban_ra')
export class BangKeBanRa extends BaseEntity {
  @Column({ type: 'date' }) ngayHoaDon: Date;
  @Column() soHoaDon: string;
  @Column({ nullable: true }) kyHieuHoaDon: string;
  @Column() tenNguoiMua: string;
  @Column({ nullable: true }) mstNguoiMua: string;
  @Column({ nullable: true }) tenHangHoa: string;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) giaTriChuaThue: number;
  @Column({ default: '10' }) thueSuat: string; // '0'|'5'|'8'|'10'|'KCT'|'KKKT'
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tienThue: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongThanhToan: number;
  @Column({ nullable: true }) ghiChu: string;
  @Column({ nullable: true }) chungTuId: string; // liên kết chứng từ (phase sau)
  @Column({ nullable: true }) soChungTu: string;
  @Column({ default: true }) isActive: boolean;
}

export interface BangKeBanRaEntities { BangKeBanRa: typeof BangKeBanRa; }
declare module '../entities' { interface Entities extends BangKeBanRaEntities {} }
