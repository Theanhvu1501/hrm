import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('employment_histories')
export class EmploymentHistory extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;   // denormalized
  @Column({ nullable: true }) employeeCode?: string;   // denormalized NV####
  @Column() loaiThayDoi: string;   // dieu_chuyen|tang_luong|bo_nhiem|doi_trang_thai|danh_gia
  @Column() ngayHieuLuc: string;
  @Column({ nullable: true }) phongBanCu?: string;
  @Column({ nullable: true }) phongBanMoi?: string;
  @Column({ nullable: true }) chucDanhCu?: string;
  @Column({ nullable: true }) chucDanhMoi?: string;
  @Column({ nullable: true }) trangThaiCu?: string;    // dang_lam_viec|tam_nghi|da_nghi
  @Column({ nullable: true }) trangThaiMoi?: string;
  @Column({ nullable: true }) mucLuongCu?: number;     // thông tin quyết định
  @Column({ nullable: true }) mucLuongMoi?: number;
  @Column({ nullable: true }) soQuyetDinh?: string;
  @Column({ nullable: true }) lyDo?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface QuaTrinhEntities { EmploymentHistory: typeof EmploymentHistory; }
declare module '../entities' { interface Entities extends QuaTrinhEntities {} }
