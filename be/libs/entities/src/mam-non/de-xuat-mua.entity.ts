import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type TrangThaiDeXuat =
  | 'NHAP'
  | 'CHO_DUYET'
  | 'DA_DUYET'
  | 'TU_CHOI'
  | 'DA_NHAN';

export interface ChiTietDeXuat {
  stt: number;
  hangHoaMa: string;
  hangHoaTen: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

@Entity('de_xuat_mua_thuc_pham')
export class DeXuatMuaThucPham extends BaseEntity {
  @Column() soPhieu: string;
  @Column() ngayDeXuat: Date;
  @Column({ nullable: true }) nguoiDeXuat: string;
  @Column({ nullable: true }) doiTuongMa: string;
  @Column({ nullable: true }) doiTuongTen: string;
  @Column({ type: 'json', default: [] }) chiTiet: ChiTietDeXuat[];
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongTien: number;
  @Column({ default: 'NHAP' }) trangThai: TrangThaiDeXuat;
  @Column({ nullable: true }) nguoiDuyet: string;
  @Column({ nullable: true }) ngayDuyet: Date;
  @Column({ nullable: true }) lyDoTuChoi: string;
  @Column({ nullable: true }) chungTuId: string; // bút toán NKC (Task 3)
  @Column({ nullable: true }) soPhieuNhapKho: string; // phiếu nhập kho (Task 3)
  @Column({ default: true }) isActive: boolean;
}

export interface DeXuatMuaThucPhamEntities {
  DeXuatMuaThucPham: typeof DeXuatMuaThucPham;
}
declare module '../entities' {
  interface Entities extends DeXuatMuaThucPhamEntities {}
}
