import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TenantContextService } from '@app/core';

/**
 * Cache interceptor với tenant-aware key.
 * Key format: api:{tenantId}:{path}:{query}
 *
 * Dùng ở controller level: @UseInterceptors(TenantCacheInterceptor)
 * Chỉ cache GET requests, tự động skip các method khác.
 */
@Injectable()
export class TenantCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TenantCache');

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly tenantContext: TenantContextService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Chỉ cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const tenantId = this.tenantContext.getCurrentTenantId() || 'default';
    const path = request.route?.path || request.url?.split('?')[0] || '';
    const query = JSON.stringify(request.query || {});

    const cacheKey = `api:${tenantId}:${path}:${query}`;

    // Check cache
    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`HIT ${cacheKey}`);
        return of(cached);
      }
    } catch (e) {
      this.logger.error(`GET error ${cacheKey}: ${e.message}`);
    }

    this.logger.log(`MISS ${cacheKey}`);

    // Execute và cache kết quả
    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.cacheManager.set(cacheKey, response, 5 * 60 * 1000); // 5 phút (ms)
          this.logger.log(`SET ${cacheKey}`);
        } catch (e) {
          this.logger.error(`SET error ${cacheKey}: ${e.message}`);
        }
      }),
    );
  }
}

/**
 * Helper để xóa cache theo pattern (khi create/update/delete)
 *
 * Dùng trong controller:
 *   constructor(private readonly cacheInvalidator: CacheInvalidator) {}
 *
 *   @Post()
 *   async create(...) {
 *     const data = await this.service.create(...);
 *     await this.cacheInvalidator.invalidateByPath('/ngay-le');
 *     return { success: true, data };
 *   }
 */
@Injectable()
export class CacheInvalidator {
  private readonly logger = new Logger('CacheInvalidator');

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly tenantContext: TenantContextService,
  ) {}

  async invalidateByPath(pathPattern: string): Promise<void> {
    const tenantId = this.tenantContext.getCurrentTenantId() || 'default';
    const store = (this.cacheManager as any).store;

    if (store?.keys) {
      const pattern = `api:${tenantId}:${pathPattern}*`;
      try {
        const keys = await store.keys(pattern);
        if (keys?.length) {
          await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
          this.logger.log(`INVALIDATE ${pattern} - ${keys.length} keys`);
        }
      } catch (e) {
        this.logger.error(`INVALIDATE error ${pattern}: ${e.message}`);
      }
    }
  }
}
