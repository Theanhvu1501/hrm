import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type LoaiPhieuKho = 'NHAP' | 'XUAT' | 'CHUYEN';

export interface ChiTietPhieuKho {
  stt: number;
  hangHoaMa: string;
  hangHoaTen: string;
  quyCach?: string;
  donViTinh?: string;
  khoMa?: string;
  khoTen?: string;
  tkNo?: string;
  tkCo?: string;
  soLuong: number;
  soLuongChungTu?: number;
  soLuongThucTe?: number;
  donGia: number;
  thanhTien: number;
}

@Entity('phieu_kho')
export class PhieuKho extends BaseEntity {
  @Column() loaiPhieu: LoaiPhieuKho;
  @Column() soPhieu: string;
  @Column({ nullable: true }) loaiNghiepVu: string;
  @Column() ngayHachToan: Date;
  @Column({ nullable: true }) ngayChungTu: Date;
  @Column({ nullable: true }) soChungTuGoc: string;
  @Column({ nullable: true }) thamChieu: string;
  @Column({ nullable: true }) doiTuongMa: string;
  @Column({ nullable: true }) doiTuongTen: string;
  @Column({ nullable: true }) diaChi: string;
  @Column({ nullable: true }) nguoiGiaoNhan: string;
  @Column({ nullable: true }) nhanVien: string;
  @Column({ nullable: true }) dienGiai: string;
  @Column({ nullable: true }) khoMa: string;
  @Column({ nullable: true }) khoTen: string;
  @Column({ nullable: true }) khoXuatMa: string;
  @Column({ nullable: true }) khoXuatTen: string;
  @Column({ nullable: true }) khoNhapMa: string;
  @Column({ nullable: true }) khoNhapTen: string;
  @Column({ nullable: true }) nguoiVanChuyen: string;
  @Column({ nullable: true }) hopDongVC: string;
  @Column({ nullable: true }) phuongTienVC: string;
  @Column({ nullable: true }) lenhDieuDong: string;
  @Column({ nullable: true }) veViec: string;
  @Column({ type: 'json', default: [] }) chiTiet: ChiTietPhieuKho[];
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongTien: number;
  @Column({ nullable: true }) tongTienBangChu: string;
  @Column({ default: 'DRAFT' }) trangThai: string;
  @Column({ default: true }) isActive: boolean;
}

export interface PhieuKhoEntities { PhieuKho: typeof PhieuKho; }
declare module '../entities' { interface Entities extends PhieuKhoEntities {} }
