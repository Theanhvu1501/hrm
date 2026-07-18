import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('don_vi_tinh')
export class DonViTinh extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface DonViTinhEntities {
  DonViTinh: typeof DonViTinh;
}

declare module '../entities' {
  interface Entities extends DonViTinhEntities {}
}
