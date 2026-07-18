import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('ly_do_khong_hop_le')
export class LyDoKhongHopLe extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface LyDoKhongHopLeEntities {
  LyDoKhongHopLe: typeof LyDoKhongHopLe;
}

declare module '../entities' {
  interface Entities extends LyDoKhongHopLeEntities {}
}
