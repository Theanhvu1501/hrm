import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('labor_contracts')
export class LaborContract extends BaseEntity {
  @Column() contractNo: string;              // HD0001 (unique per tenant, service-enforced)
  @Column() employeeId: string;              // Employee._id
  @Column({ nullable: true }) employeeName?: string;  // denormalized (display)
  @Column({ nullable: true }) employeeCode?: string;  // denormalized NV#### (display)
  /**
   * Chức danh NHÂN VIÊN TẠI THỜI ĐIỂM KÝ — denormalized snapshot, giống
   * employeeName/employeeCode ở trên (FE tự điền lúc chọn nhân viên trong
   * form, xem HopDongLaoDongForm.tsx). CỐ Ý tách khỏi Employee.chucDanh
   * (thay đổi theo thời gian): in lại hợp đồng cũ phải ra ĐÚNG chức danh đã
   * ký, không phải chức danh hiện tại của nhân viên đó (review Important #4).
   * Hợp đồng tạo TRƯỚC cột này sẽ rỗng — renderHopDong() fallback về
   * Employee.chucDanh hiện tại kèm cảnh báo, không chặn in.
   */
  @Column({ nullable: true }) chucDanh?: string;
  @Column() loaiHopDong: string;             // thu_viec|xac_dinh_thoi_han|khong_xac_dinh_thoi_han|dich_vu
  @Column({ nullable: true }) ngayBatDau?: string;
  @Column({ nullable: true }) ngayKetThuc?: string;   // null cho không xác định thời hạn
  @Column({ nullable: true }) mucLuong?: number;
  @Column({ nullable: true }) phuCap?: number;
  @Column({ nullable: true }) hinhThucTraLuong?: string;  // gross|net
  @Column({ default: 'du_thao' }) trangThai: string;   // du_thao|dang_hieu_luc|het_han|da_thanh_ly
  @Column({ nullable: true }) ghiChu?: string;
  @Column({ nullable: true }) fileUrl?: string;        // PDF (phase sau)
  @Column({ default: true }) isActive: boolean;
}

@Entity('contract_counters')
export class ContractCounter extends BaseEntity {
  @Column() seq: number;
}

export interface HopDongEntities { LaborContract: typeof LaborContract; ContractCounter: typeof ContractCounter; }
declare module '../entities' { interface Entities extends HopDongEntities {} }
