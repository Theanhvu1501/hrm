import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { KhoanLuong, BacThue, CauHinhLamThem, CanCuBHXH } from './luong.types';

@Entity('cau_hinh_luong')
export class CauHinhLuong extends BaseEntity {
  @Column({ default: 5_500_000 }) mucKhaiBaoMacDinh: number;
  @Column({ default: 24 }) congChuan: number;
  @Column('json', { nullable: true }) khoanLuong: KhoanLuong[];
  @Column({ default: 15_500_000 }) giamTruBanThan: number;
  @Column({ default: 6_200_000 }) giamTruNPT: number;
  @Column('json', { nullable: true }) bhxh: { tyLe: number; canCu: CanCuBHXH };
  @Column('json', { nullable: true }) bhCongTy: { tyLe: number; tyLeHopDongThu2: number };
  /** Trừ vào lương NLĐ, tính trên lương đóng bảo hiểm — xem `CauHinhLuongData`. */
  @Column('json', { nullable: true }) phiCongDoan: { tyLe: number };
  @Column('json', { nullable: true }) bacThue: BacThue[];
  @Column('json', { nullable: true }) thuViec: { tyLe: number };
  @Column('json', { nullable: true }) quyTacThoiVu: { tyLe: number; nguong: number };
  @Column('json', { nullable: true }) quyTacCamKet: { mienThue: boolean };
  /**
   * Trừ thuế TNCN của NLĐ theo mức nào (yêu cầu d32: "Hiện trạng sai Khấu trừ
   * thuế của NLĐ").
   *
   * `khai_bao` (mặc định) — trừ đúng số thuế đã KHAI và NỘP cho cơ quan thuế.
   * `thuc_te` — trừ theo thuế tính trên lương thật.
   *
   * Vì sao mặc định `khai_bao`: trừ của người lao động nhiều hơn số thực nộp
   * thì phần chênh không đi đâu cả, và không giải thích được với họ.
   */
  @Column({ default: 'khai_bao' }) khauTruThueTheo: string;
  @Column({ default: 1000 }) lamTron: number;
  @Column({ default: 8 }) soGioMoiNgay: number;
  @Column('json', { nullable: true }) lamThem: CauHinhLamThem;
  @Column({ default: true }) isActive: boolean;
}

export interface CauHinhLuongEntities { CauHinhLuong: typeof CauHinhLuong; }
declare module '../entities' { interface Entities extends CauHinhLuongEntities {} }
