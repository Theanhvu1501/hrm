import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { KhoanLuong, BacThue } from './luong.types';

@Entity('cau_hinh_luong')
export class CauHinhLuong extends BaseEntity {
  @Column({ default: 5_500_000 }) mucKhaiBaoMacDinh: number;
  @Column({ default: 24 }) congChuan: number;
  @Column('json', { nullable: true }) khoanLuong: KhoanLuong[];
  @Column({ default: 15_500_000 }) giamTruBanThan: number;
  @Column({ default: 6_200_000 }) giamTruNPT: number;
  @Column('json', { nullable: true }) bhxh: { tyLe: number; canCu: 'MUC_KHAI_BAO' | 'LUONG_THOA_THUAN' };
  @Column('json', { nullable: true }) bacThue: BacThue[];
  @Column('json', { nullable: true }) thuViec: { tyLe: number };
  @Column('json', { nullable: true }) quyTacThoiVu: { tyLe: number; nguong: number };
  @Column('json', { nullable: true }) quyTacCamKet: { mienThue: boolean };
  @Column({ default: 1000 }) lamTron: number;
  @Column({ default: true }) isActive: boolean;
}

export interface CauHinhLuongEntities { CauHinhLuong: typeof CauHinhLuong; }
declare module '../entities' { interface Entities extends CauHinhLuongEntities {} }
