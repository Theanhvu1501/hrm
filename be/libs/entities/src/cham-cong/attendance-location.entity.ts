import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('attendance_locations')
export class AttendanceLocation extends BaseEntity {
  @Column() ten: string;
  @Column() loai: string; // gps|wifi|qr
  @Column({ nullable: true }) latitude?: number;
  @Column({ nullable: true }) longitude?: number;
  @Column({ nullable: true }) banKinh?: number; // meters
  @Column({ nullable: true }) ipWifi?: string;
  @Column({ nullable: true }) maQr?: string;
  @Column({ nullable: true }) diaChi?: string;
  @Column({ nullable: true }) chiNhanh?: string;
  @Column({ nullable: true }) phongBan?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface AttendanceLocationEntities {
  AttendanceLocation: typeof AttendanceLocation;
}
declare module '../entities' {
  interface Entities extends AttendanceLocationEntities {}
}
