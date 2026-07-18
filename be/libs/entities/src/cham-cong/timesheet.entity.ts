import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export interface ChiTietNgayCong {
  ngay: number; // 1..31
  kyHieu: string;
}

@Entity('timesheets')
export class Timesheet extends BaseEntity {
  @Column() thang: string; // "YYYY-MM"
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column('json', { nullable: true }) chiTietNgay?: ChiTietNgayCong[];
  @Column({ default: 0 }) soNgayCong: number; // computed from chiTietNgay
  @Column({ default: 0 }) soNgayNghiPhep: number; // computed: count of 'P'
  @Column({ default: 0 }) soNgayNghiKhongLuong: number; // computed: count of 'KL'
  @Column({ default: 0 }) soNgayOm: number; // computed: count of 'O'
  @Column({ default: 0 }) soGioLamThem: number; // OT hours, auto-filled from approved requests
  @Column({ default: 0 }) soLanDiMuon: number;
  @Column({ default: 0 }) soLanVeSom: number;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: 'nhap' }) trangThai: string; // nhap|chot
  @Column({ default: true }) isActive: boolean;
}

export interface TimesheetEntities {
  Timesheet: typeof Timesheet;
}
declare module '../entities' {
  interface Entities extends TimesheetEntities {}
}
