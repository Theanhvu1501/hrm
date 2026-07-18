import { Injectable } from '@nestjs/common';
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  ObjectLiteral,
  DataSource,
} from 'typeorm';
import { TenantContextService } from '@app/core';

interface TenantEntity extends ObjectLiteral {
  tenantId?: string;
}

// Entities that should NOT have tenantId auto-set
// These are either tenant-exempt or use tenantId differently
const TENANT_EXEMPT_ENTITIES = [
  'User',
  'UserCredential',
  'UserTenant',
  'Tenant',
];

@Injectable()
@EventSubscriber()
export class TenantSubscriber implements EntitySubscriberInterface {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantContext: TenantContextService,
  ) {
    dataSource.subscribers.push(this);
  }

  /**
   * Auto-set tenantId before insert if entity has tenantId field
   */
  beforeInsert(event: InsertEvent<TenantEntity>): void {
    const entityName = event.metadata?.name;
    if (entityName && TENANT_EXEMPT_ENTITIES.includes(entityName)) {
      return;
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId && event.entity && !event.entity.tenantId) {
      event.entity.tenantId = tenantId;
    }
  }

  /**
   * Auto-set tenantId before update if entity has tenantId field
   */
  beforeUpdate(event: UpdateEvent<TenantEntity>): void {
    const entityName = event.metadata?.name;
    if (entityName && TENANT_EXEMPT_ENTITIES.includes(entityName)) {
      return;
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId && event.entity && !event.entity.tenantId) {
      event.entity.tenantId = tenantId;
    }
  }
}
