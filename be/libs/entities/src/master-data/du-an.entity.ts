import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum DuAnStatus {
  DANG_THUC_HIEN = 'DANG_THUC_HIEN',
  HOAN_THANH = 'HOAN_THANH',
  TAM_DUNG = 'TAM_DUNG',
}

@Entity('du_an')
export class DuAn extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  ngayBatDau: Date;

  @Column({ nullable: true })
  ngayKetThuc: Date;

  @Column({ nullable: true })
  chuDauTuId: string;

  @Column({ nullable: true })
  chuDuAnMa: string;

  @Column({ nullable: true })
  chuDuAn: string;

  @Column({
    type: 'enum',
    enum: DuAnStatus,
    default: DuAnStatus.DANG_THUC_HIEN,
  })
  trangThai: DuAnStatus;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface DuAnEntities {
  DuAn: typeof DuAn;
}

declare module '../entities' {
  interface Entities extends DuAnEntities {}
}
