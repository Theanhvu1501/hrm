import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('vai_tro')
export class VaiTro extends BaseEntity {
  @Column({ unique: true })
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface VaiTroEntities {
  VaiTro: typeof VaiTro;
}

declare module '../entities' {
  interface Entities extends VaiTroEntities {}
}
