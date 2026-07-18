import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('mam_non_sequence')
export class MamNonSequence extends BaseEntity {
  @Column() loai: string; // 'DE_XUAT'
  @Column({ default: 0 }) current: number;
}

export interface MamNonSequenceEntities {
  MamNonSequence: typeof MamNonSequence;
}
declare module '../entities' {
  interface Entities extends MamNonSequenceEntities {}
}
