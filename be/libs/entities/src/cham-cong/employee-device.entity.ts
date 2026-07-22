import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('employee_devices')
export class EmployeeDevice extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  // Do client sinh và gửi lên. Backend KHÔNG tự suy ra — xem
  // fe/src/services/deviceIdentity.ts.
  @Column() deviceId: string;
  @Column({ nullable: true }) tenThietBi?: string;
  @Column({ nullable: true }) userAgent?: string;
  @Column({ default: 'cho_duyet' }) trangThai: string; // cho_duyet|da_duyet|tu_choi|thu_hoi
  @Column({ nullable: true }) lanDauDangKy?: string;   // ISO
  @Column({ nullable: true }) lanDuyet?: string;       // ISO
  @Column({ nullable: true }) nguoiDuyet?: string;
  @Column({ nullable: true }) lyDoThuHoi?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface EmployeeDeviceEntities {
  EmployeeDevice: typeof EmployeeDevice;
}
declare module '../entities' {
  interface Entities extends EmployeeDeviceEntities {}
}
