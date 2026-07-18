import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('attendance_requests')
export class AttendanceRequest extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  @Column() loaiDon: string; // giai_trinh|lam_them_gio
  @Column() ngay: string;
  @Column({ nullable: true }) lyDo?: string;
  @Column({ nullable: true }) gioTu?: string; // "HH:mm", for OT
  @Column({ nullable: true }) gioDen?: string; // "HH:mm", for OT
  @Column({ nullable: true }) minhChung?: string;
  @Column({ default: 'cho_duyet' }) trangThai: string; // cho_duyet|da_duyet|tu_choi
  @Column({ nullable: true }) nguoiDuyet?: string;
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface AttendanceRequestEntities {
  AttendanceRequest: typeof AttendanceRequest;
}
declare module '../entities' {
  interface Entities extends AttendanceRequestEntities {}
}
