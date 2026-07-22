import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Một nhân viên chỉ được có ĐÚNG MỘT dòng cho mỗi `deviceId`. Không có ràng
 * buộc này thì hai request chấm công đồng thời từ cùng một máy mới đều thấy
 * bảng rỗng và cùng ghi → hai dòng trùng `deviceId`, đúng điều kiện sinh ra
 * dữ liệu bất nhất mà cổng `kiemTraThietBi` phải chặn fail-closed.
 */
@Entity('employee_devices')
@Index('IDX_employee_device_unique', ['tenantId', 'employeeId', 'deviceId'], {
  unique: true,
})
export class EmployeeDevice extends BaseEntity {
  @Column() employeeId: string;
  @Column({ nullable: true }) employeeName?: string;
  @Column({ nullable: true }) employeeCode?: string;
  // Do client sinh (UUID lưu trong localStorage) và gửi lên. Backend KHÔNG
  // tự suy ra được. Module sinh/giữ định danh phía FE thuộc task sau, chưa
  // tồn tại trong repo tại thời điểm này.
  @Column() deviceId: string;
  @Column({ nullable: true }) tenThietBi?: string;
  @Column({ nullable: true }) userAgent?: string;
  @Column({ default: 'cho_duyet' }) trangThai: string; // cho_duyet|da_duyet|tu_choi|thu_hoi
  @Column({ nullable: true }) lanDauDangKy?: string; // ISO
  @Column({ nullable: true }) lanDuyet?: string; // ISO
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
