import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum DoiTuongType {
  KHACH_HANG = 'KHACH_HANG',
  NHA_CUNG_CAP = 'NHA_CUNG_CAP',
  NHAN_VIEN = 'NHAN_VIEN',
  NHA_THAU = 'NHA_THAU',
}

@Entity('doi_tuong')
export class DoiTuong extends BaseEntity {
  // Đối tượng có thể thuộc nhiều loại cùng lúc (vd vừa Khách hàng vừa NCC).
  // MongoDB lưu mảng native; query { loai: X } tự match document có mảng chứa X.
  @Column()
  loai: DoiTuongType[];

  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  diaChi: string;

  @Column({ nullable: true })
  soDienThoai: string;

  @Column({ nullable: true })
  email: string;

  @Column()
  maSoThue: string;

  @Column({ nullable: true })
  nguoiLienHe: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface DoiTuongEntities {
  DoiTuong: typeof DoiTuong;
}

declare module '../entities' {
  interface Entities extends DoiTuongEntities {}
}
