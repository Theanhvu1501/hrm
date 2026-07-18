import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Một nhãn trong từ điển thuật ngữ: nhãn gốc + override theo vị trí. */
export interface GlossaryItem {
  label: string;
  surfaces?: Record<string, string>;
}

/** Từ điển thuật ngữ: key khái niệm (vd 'chuDauTu') → nhãn. */
export type Glossary = Record<string, GlossaryItem>;

@Entity('tenant_app_config')
export class TenantAppConfig extends BaseEntity {
  @Column() declare tenantId: string;
  @Column({ type: 'json', default: ['KE_TOAN'] }) modules: string[];
  @Column({ nullable: true }) nganh?: string | null;
  @Column({ type: 'json', default: {} }) glossary: Glossary;
  @Column({ type: 'json', nullable: true }) dashboardBlocks?: string[] | null;
}
