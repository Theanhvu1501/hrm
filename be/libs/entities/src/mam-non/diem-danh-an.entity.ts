import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('diem_danh_an')
export class DiemDanhAn extends BaseEntity {
  @Column() ngay: Date;
  @Column() lopMa: string;
  @Column() lopTen: string;
  @Column({ nullable: true }) goiAnMa: string;
  @Column({ default: 0 }) soTreDangKy: number;
  @Column({ default: 0 }) soTreAnThucTe: number;
  @Column({ nullable: true }) congThucCode: string;
  @Column({ nullable: true }) ghiChu: string;
  @Column({ default: true }) isActive: boolean;
}

export interface DiemDanhAnEntities { DiemDanhAn: typeof DiemDanhAn; }
declare module '../entities' { interface Entities extends DiemDanhAnEntities {} }
