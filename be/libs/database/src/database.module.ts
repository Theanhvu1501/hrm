import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule, TypeOrmModuleOptions, getRepositoryToken } from '@nestjs/typeorm';
import { TenantModule, TenantContextService, TENANT_EXEMPT_ENTITIES } from '@app/core';
import { TenantActiveGuard } from '@app/auth';
import { TenantSubscriber } from './tenant.subscriber';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';

export interface DatabaseModuleOptions {
  uri?: string;
  database?: string;
  synchronize?: boolean;
  logging?: boolean;
  user?: string;
  pwd?: string;
}

/**
 * Creates a proxy that intercepts repository methods and adds tenant filtering
 * ALL services must follow tenant filtering - no exceptions
 */
function createTenantAwareProxy<T extends ObjectLiteral>(
  repository: Repository<T>,
  tenantContext: TenantContextService,
): Repository<T> {
  const handler: ProxyHandler<Repository<T>> = {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);

      if (typeof original !== 'function') {
        return original;
      }

      // Methods that need tenant filtering on WHERE clause
      const filterMethods = ['find', 'findOne', 'findBy', 'findOneBy', 'count', 'countBy', 'exist', 'findAndCount', 'findAndCountBy'];

      // Methods that need tenant injection on entity
      const injectMethods = ['save', 'insert', 'create'];

      // Methods that need tenant filtering on criteria
      const criteriaMethods = ['update', 'delete', 'softDelete', 'restore'];

      if (filterMethods.includes(prop as string)) {
        return function (...args: any[]) {
          const tenantId = tenantContext.getCurrentTenantId();

          // No tenant context = no filtering (for unauthenticated requests)
          if (!tenantId) return original.apply(target, args);

          const [options] = args;

          // Handle different method signatures
          if (prop === 'findBy' || prop === 'findOneBy' || prop === 'countBy') {
            // These methods take where directly as first argument
            if (Array.isArray(options)) {
              args[0] = options.map((w: any) => ({ ...w, tenantId }));
            } else if (options && typeof options === 'object') {
              args[0] = { ...options, tenantId };
            }
          } else {
            // find, findOne, count, exist take options object
            if (!options) {
              args[0] = { where: { tenantId } };
            } else if (options.where) {
              if (Array.isArray(options.where)) {
                options.where = options.where.map((w: any) => ({ ...w, tenantId }));
              } else {
                options.where = { ...options.where, tenantId };
              }
            } else {
              options.where = { tenantId };
            }
          }

          return original.apply(target, args);
        };
      }

      if (injectMethods.includes(prop as string)) {
        return function (...args: any[]) {
          const tenantId = tenantContext.getCurrentTenantId();

          // No tenant context = no injection
          if (!tenantId) return original.apply(target, args);

          const [entity] = args;
          if (Array.isArray(entity)) {
            args[0] = entity.map((e: any) => ({
              ...e,
              tenantId: e.tenantId || tenantId
            }));
          } else if (entity && typeof entity === 'object') {
            args[0] = { ...entity, tenantId: entity.tenantId || tenantId };
          }

          return original.apply(target, args);
        };
      }

      if (criteriaMethods.includes(prop as string)) {
        return function (...args: any[]) {
          const tenantId = tenantContext.getCurrentTenantId();

          // No tenant context = no filtering
          if (!tenantId) return original.apply(target, args);

          const [criteria] = args;
          if (criteria && typeof criteria === 'object') {
            args[0] = { ...criteria, tenantId };
          }

          return original.apply(target, args);
        };
      }

      // Wrap aggregate to auto-inject tenantId into $match at the start of pipeline
      if (prop === 'aggregate') {
        return function (...args: any[]) {
          const tenantId = tenantContext.getCurrentTenantId();
          if (!tenantId) return original.apply(target, args);

          const [pipeline] = args;
          if (Array.isArray(pipeline)) {
            const first = pipeline[0];
            if (first && '$match' in first) {
              first.$match = { ...first.$match, tenantId };
            } else {
              pipeline.unshift({ $match: { tenantId } });
            }
          }
          return original.apply(target, args);
        };
      }

      // Return original for other methods
      return original.bind(target);
    },
  };

  return new Proxy(repository, handler);
}

/**
 * Token prefix for raw (non-proxied) repositories
 * Used by SuperAdmin services that need to bypass tenant filtering
 */
export const RAW_REPOSITORY_TOKEN_PREFIX = 'RAW_';

/**
 * Separate module class for forFeature() to avoid global module merge issue
 * DatabaseModule.forRoot() is global, so using the same class in forFeature()
 * causes NestJS to merge providers into the global scope, letting TypeORM's
 * repository provider override our custom tenant-aware proxy.
 */
@Module({})
export class TenantRepositoryModule {}

@Module({})
export class DatabaseModule {
  /**
   * Configure database connection for root module
   * @param options - Database configuration options
   */
  static forRoot(options?: DatabaseModuleOptions): DynamicModule {
    const uri = options?.uri || process.env.MONGODB_URI;
    const database = options?.database || process.env.MONGODB_DATABASE;
    const synchronize =
      options?.synchronize ?? process.env.NODE_ENV === 'development';
    const logging = options?.logging ?? process.env.NODE_ENV === 'development';
    const user = options?.user || process.env.MONGODB_USER;
    const pwd = options?.pwd || process.env.MONGODB_PWD;
    const typeOrmOptions: TypeOrmModuleOptions = {
      type: 'mongodb',
      url: `${uri}`,
      database: database,
      username: user,
      password: pwd,
      synchronize,
      logging,
      autoLoadEntities: true,
    };

    return {
      module: DatabaseModule,
      global: true,
      imports: [TypeOrmModule.forRoot(typeOrmOptions), TenantModule],
      providers: [
        TenantSubscriber,
        {
          provide: APP_GUARD,
          useClass: TenantActiveGuard,
        },
      ],
      exports: [TypeOrmModule, TenantSubscriber],
    };
  }

  /**
   * Register entities for feature modules with automatic tenant filtering
   * @param entities - Array of entity classes
   */
  static forFeature(entities: any[]): DynamicModule {
    // Create tenant-aware repository providers for non-exempt entities
    const tenantAwareProviders = entities
      .filter((entity) => !TENANT_EXEMPT_ENTITIES.includes(entity.name))
      .map((entity) => ({
        provide: getRepositoryToken(entity),
        useFactory: (dataSource: DataSource, tenantContext: TenantContextService) => {
          const repository = dataSource.getMongoRepository(entity);
          return createTenantAwareProxy(repository, tenantContext);
        },
        inject: [DataSource, TenantContextService],
      }));

    return {
      module: TenantRepositoryModule,
      imports: [
        TypeOrmModule.forFeature(entities),
        TenantModule,
      ],
      providers: tenantAwareProviders,
      exports: [TypeOrmModule, ...tenantAwareProviders.map((p) => p.provide)],
    };
  }

  /**
   * Register entities with RAW repositories (no tenant filtering)
   * ONLY use this for SuperAdmin services that need to bypass tenant filtering
   * @param entities - Array of entity classes
   */
  static forFeatureRaw(entities: any[]): DynamicModule {
    // Create raw repository providers (no proxy, no tenant filtering)
    const rawProviders = entities.map((entity) => ({
      provide: `${RAW_REPOSITORY_TOKEN_PREFIX}${entity.name}`,
      useFactory: (dataSource: DataSource) => {
        return dataSource.getRepository(entity);
      },
      inject: [DataSource],
    }));

    return {
      module: TenantRepositoryModule,
      imports: [TypeOrmModule.forFeature(entities)],
      providers: rawProviders,
      exports: rawProviders.map((p) => p.provide),
    };
  }
}

/**
 * Decorator to inject raw repository (bypasses tenant filtering)
 * ONLY use in SuperAdmin services
 */
export function InjectRawRepository(entity: { name: string }): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const token = `${RAW_REPOSITORY_TOKEN_PREFIX}${entity.name}`;
    // Use Inject decorator internally
    const existingInjectedParams: Record<number, string> =
      Reflect.getMetadata('self:paramtypes', target) || {};
    existingInjectedParams[parameterIndex] = token;
    Reflect.defineMetadata('self:paramtypes', existingInjectedParams, target);
    // Also set the design:paramtypes for the DI system
    Reflect.defineMetadata(`inject:${parameterIndex}`, token, target);
  };
}

