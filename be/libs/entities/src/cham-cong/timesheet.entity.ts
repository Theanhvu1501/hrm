import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('timesheets')
export class Timesheet extends BaseEntity {
  @Column() thang: string; // "YYYY-MM"
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column({ default: 0 }) soNgayCong: number;
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
