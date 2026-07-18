import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export interface ChecklistBanGiaoItem {
  noiDung: string;
  hoanThanh: boolean;
}

@Entity('resignations')
export class Resignation extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string; // denormalized
  @Column({ nullable: true }) employeeCode?: string; // denormalized NV####
  @Column() ngayNopDon: string;
  @Column({ nullable: true }) ngayLamViecCuoi?: string;
  @Column() loaiThoiViec: string; // tu_nguyen|ky_luat|het_han_hd|khac
  @Column({ nullable: true }) lyDo?: string;
  @Column({ nullable: true }) viPham?: string;
  @Column('json', { nullable: true }) checklistBanGiao?: ChecklistBanGiaoItem[];
  @Column({ default: 'cho_duyet' }) trangThai: string; // cho_duyet|da_duyet|hoan_thanh|tu_choi
  @Column({ nullable: true }) soQuyetDinh?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface ResignationEntities { Resignation: typeof Resignation; }
declare module '../entities' { interface Entities extends ResignationEntities {} }
