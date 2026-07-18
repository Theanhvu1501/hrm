import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('chu_dau_tu')
export class ChuDauTu extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface ChuDauTuEntities {
  ChuDauTu: typeof ChuDauTu;
}

declare module '../entities' {
  interface Entities extends ChuDauTuEntities {}
}
