import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { Glossary } from '../nganh/nganh.entity';

// Lĩnh vực (entitlement) — danh mục động, quản lý qua UI SuperAdmin.
// menuKeys: các menu key (= path route) thuộc lĩnh vực này. Nhiều-nhiều:
// 1 key có thể nằm trong menuKeys của nhiều lĩnh vực.
@Entity('linh_vuc')
export class LinhVuc extends BaseEntity {
  @Column({ unique: true })
  code: string; // bất biến sau khi tạo, vd 'KE_TOAN'

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'AppstoreOutlined' })
  icon: string; // tên icon AntD (whitelist FE)

  @Column({ default: '#1B3A6B' })
  color: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', default: [] })
  menuKeys: string[];

  @Column({ type: 'json', default: {} })
  glossary: Glossary;
}
