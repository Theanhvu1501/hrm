import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('quy_chuan')
export class QuyChuan extends BaseEntity {
  @Column()
  loaiGiaoDich: string;

  @Column()
  nghiepVu: string;

  @Column()
  taiKhoanNo: string;

  @Column()
  taiKhoanCo: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ type: 'simple-json', nullable: true })
  hoSoChungTu?: { id: string; ma: string; ten: string }[];

  @Column({ default: true })
  isActive: boolean;
}

export interface QuyChaunEntities {
  QuyChuan: typeof QuyChuan;
}

declare module '../entities' {
  interface Entities extends QuyChaunEntities {}
}
