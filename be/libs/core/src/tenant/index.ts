export * from './tenant-context.service';
export * from './tenant.middleware';
export * from './tenant.module';

/**
 * Entities that should NOT have tenant filtering (system-wide entities)
 */
export const TENANT_EXEMPT_ENTITIES = [
  'Tenant', // Tenant entity itself
  'User',   // Users can belong to multiple tenants
  'UserCredential', // Credentials are user-level, not tenant-level
  'UserTenant', // User-tenant membership is cross-tenant
  'AppUserRole', // Queried by userId+tenantId explicitly; exempt like UserTenant
  'TenantAppConfig', // Queried by tenantId explicitly; login happens before tenant context
  'TenantApp', // Identity-side entitlement; queried by tenantId+appId, no ke-toan tenantId context
];
