import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('work_shifts')
export class WorkShift extends BaseEntity {
  @Column() ten: string; // tên ca
  @Column() gioBatDau: string; // "HH:mm"
  @Column() gioKetThuc: string; // "HH:mm"
  @Column({ nullable: true }) gioNghiTu?: string; // "HH:mm" break start
  @Column({ nullable: true }) gioNghiDen?: string; // "HH:mm" break end
  @Column({ default: false }) laCaQuaDem: boolean; // computed: gioKetThuc <= gioBatDau
  @Column({ default: false }) laLinhHoat: boolean;
  @Column({ nullable: true }) soPhutLinhHoat?: number;
  @Column({ nullable: true }) moTa?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface ChamCongEntities { WorkShift: typeof WorkShift; }
declare module '../entities' { interface Entities extends ChamCongEntities {} }
