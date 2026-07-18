import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('nhom_quan_ly')
export class NhomQuanLy extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomQuanLyEntities {
  NhomQuanLy: typeof NhomQuanLy;
}

declare module '../entities' {
  interface Entities extends NhomQuanLyEntities {}
}
