import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('phan_quyen')
export class PhanQuyen extends BaseEntity {
  @Column()
  vaiTro: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column('array')
  permissions: string[];

  @Column({ default: true })
  isActive: boolean;
}

export interface PhanQuyenEntities {
  PhanQuyen: typeof PhanQuyen;
}

declare module '../entities' {
  interface Entities extends PhanQuyenEntities {}
}
