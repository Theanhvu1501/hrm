import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { Glossary } from '../nganh/nganh.entity';

@Entity('tenant_app_config')
export class TenantAppConfig extends BaseEntity {
  @Column() declare tenantId: string;
  @Column({ type: 'json', default: ['KE_TOAN'] }) modules: string[];
  @Column({ nullable: true }) nganh?: string | null;
  @Column({ type: 'json', default: {} }) glossary: Glossary;
  @Column({ type: 'json', nullable: true }) dashboardBlocks?: string[] | null;
}
