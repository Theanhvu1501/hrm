import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('kho')
export class Kho extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  diaChi: string;

  @Column({ nullable: true })
  thuKho: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface KhoEntities {
  Kho: typeof Kho;
}

declare module '../entities' {
  interface Entities extends KhoEntities {}
}
