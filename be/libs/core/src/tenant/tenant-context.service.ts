import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { SUPER_ADMIN_EMAIL } from '@app/entities';

export interface TenantContext {
  tenantId: string;
  userId: string;
  email?: string;
}

@Injectable()
export class TenantContextService {
  private static storage = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, callback: () => T): T {
    return TenantContextService.storage.run(context, callback);
  }

  getCurrentTenantId(): string | undefined {
    return TenantContextService.storage.getStore()?.tenantId;
  }

  getCurrentUserId(): string | undefined {
    return TenantContextService.storage.getStore()?.userId;
  }

  getCurrentEmail(): string | undefined {
    return TenantContextService.storage.getStore()?.email;
  }

  isSuperAdmin(): boolean {
    const email = TenantContextService.storage.getStore()?.email;
    return email === SUPER_ADMIN_EMAIL;
  }

  getStore(): TenantContext | undefined {
    return TenantContextService.storage.getStore();
  }
}
