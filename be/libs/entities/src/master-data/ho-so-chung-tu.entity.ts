import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('ho_so_chung_tu')
export class HoSoChungTu extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface HoSoChungTuEntities {
  HoSoChungTu: typeof HoSoChungTu;
}

declare module '../entities' {
  interface Entities extends HoSoChungTuEntities {}
}
