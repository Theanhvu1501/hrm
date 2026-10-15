import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisHost = config.get<string>('REDIS_HOST');

        if (!redisHost) {
          console.log('[CacheModule] REDIS_HOST not set, using in-memory cache');
          return { ttl: 5 * 60 * 1000 };
        }

        console.log(`[CacheModule] Connecting to Redis at ${redisHost}`);
        return {
          store: await redisStore({
            socket: {
              host: redisHost,
              port: config.get<number>('REDIS_PORT', 6379),
            },
            password: config.get<string>('REDIS_PASSWORD') || undefined,
            ttl: 5 * 60 * 1000,
          }),
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
