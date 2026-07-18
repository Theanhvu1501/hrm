import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('bo_phan')
export class BoPhan extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface BoPhanEntities {
  BoPhan: typeof BoPhan;
}

declare module '../entities' {
  interface Entities extends BoPhanEntities {}
}
