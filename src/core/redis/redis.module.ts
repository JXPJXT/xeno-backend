import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_OPTIONS',
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        if (url) {
          try {
            const parsed = new URL(url);
            return {
              host: parsed.hostname,
              port: parseInt(parsed.port || '6379', 10),
              password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
              username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
              tls: url.startsWith('rediss://') ? {} : undefined,
            };
          } catch (e) {
            // Fallback if URL is invalid
          }
        }
        return {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        };
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
