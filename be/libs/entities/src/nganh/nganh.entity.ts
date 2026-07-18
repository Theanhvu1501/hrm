import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Một nhãn trong từ điển ngành: nhãn gốc + override theo vị trí. */
export interface GlossaryItem {
  label: string;
  surfaces?: Record<string, string>;
}

/** Từ điển thuật ngữ: key khái niệm (vd 'chuDauTu') → nhãn. */
export type Glossary = Record<string, GlossaryItem>;

/** Ngành (vd Xây dựng, Mầm non) — quyết định nhãn hiển thị + là template clone. */
@Entity('nganh')
export class Nganh extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', default: {} })
  glossary: Glossary;
}
