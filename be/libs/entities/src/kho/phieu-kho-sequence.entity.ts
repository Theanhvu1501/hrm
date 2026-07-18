import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('phieu_kho_sequence')
export class PhieuKhoSequence extends BaseEntity {
  @Column() loaiPhieu: string;   // NHAP | XUAT | CHUYEN
  @Column({ default: 0 }) current: number;
}

export interface PhieuKhoSequenceEntities { PhieuKhoSequence: typeof PhieuKhoSequence; }
declare module '../entities' { interface Entities extends PhieuKhoSequenceEntities {} }
