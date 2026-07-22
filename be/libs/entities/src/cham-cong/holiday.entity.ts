import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('holidays')
export class Holiday extends BaseEntity {
  @Column() ten: string;
  @Column() tuNgay: string; // "YYYY-MM-DD", bao gồm cả hai đầu
  @Column() denNgay: string; // "YYYY-MM-DD"
  @Column() nam: number; // suy từ tuNgay, để lọc nhanh
  @Column({ default: 'le' }) loai: string; // le|nghi_cty
  @Column({ default: true }) huongLuong: boolean;
  @Column({ nullable: true }) moTa?: string;
  @Column({ default: true }) isActive: boolean;
}

export interface HolidayEntities {
  Holiday: typeof Holiday;
}
declare module '../entities' {
  interface Entities extends HolidayEntities {}
}
