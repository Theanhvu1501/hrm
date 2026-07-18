import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('nhom_vat_tu')
export class NhomVatTu extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomVatTuEntities {
  NhomVatTu: typeof NhomVatTu;
}

declare module '../entities' {
  interface Entities extends NhomVatTuEntities {}
}
