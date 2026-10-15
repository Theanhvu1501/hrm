import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheInvalidator, TenantCacheInterceptor } from './tenant-cache.interceptor';

const logger = new Logger('CacheModule');

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>('REDIS_HOST');

        // Nếu không có REDIS_HOST, dùng in-memory cache (dev mode)
        if (!redisHost) {
          logger.log('REDIS_HOST not set, using in-memory cache');
          return { ttl: 5 * 60 * 1000 }; // 5 phút (ms)
        }

        // Production: dùng Redis
        try {
          const redisPort = config.get<number>('REDIS_PORT', 6379);
          const redisPassword = config.get<string>('REDIS_PASSWORD');

          logger.log(`Connecting to Redis at ${redisHost}:${redisPort}`);

          const store = await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
            },
            password: redisPassword || undefined,
            ttl: 5 * 60 * 1000, // 5 phút (ms)
          });

          return { store };
        } catch (err) {
          logger.error(`Failed to connect Redis: ${err.message}, falling back to in-memory`);
          return { ttl: 5 * 60 * 1000 };
        }
      },
    }),
  ],
  providers: [CacheInvalidator, TenantCacheInterceptor],
  exports: [NestCacheModule, CacheInvalidator, TenantCacheInterceptor],
})
export class CacheModule {}
