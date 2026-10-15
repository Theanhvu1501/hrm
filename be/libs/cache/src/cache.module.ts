import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';
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
          return {
            ttl: 5 * 60 * 1000, // 5 phút (ms)
          };
        }

        // Production: dùng Redis via Keyv
        try {
          const redisPort = config.get<number>('REDIS_PORT', 6379);
          const redisPassword = config.get<string>('REDIS_PASSWORD');

          const redisUrl = redisPassword
            ? `redis://:${redisPassword}@${redisHost}:${redisPort}`
            : `redis://${redisHost}:${redisPort}`;

          const keyvRedis = new KeyvRedis(redisUrl);
          const keyv = new Keyv({ store: keyvRedis, namespace: 'cache' });

          // Test connection
          await keyv.set('__test__', 'ok', 1000);
          const testVal = await keyv.get('__test__');
          if (testVal === 'ok') {
            logger.log(`Connected to Redis at ${redisHost}:${redisPort} via Keyv`);
            return {
              stores: [keyv],
              ttl: 5 * 60 * 1000, // 5 phút (ms)
            };
          }
          throw new Error('Redis test write/read failed');
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
