import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(
    @Inject('REDIS_OPTIONS')
    private readonly options: {
      host: string;
      port: number;
      password?: string;
      username?: string;
      tls?: any;
    },
  ) {
    this.client = new Redis({
      host: this.options.host,
      port: this.options.port,
      password: this.options.password,
      username: this.options.username,
      tls: this.options.tls,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error('Redis connection failed after 10 retries');
          return null;
        }
        return Math.min(times * 200, 5000);
      },
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to Redis...');
    try {
      await this.client.ping();
      this.logger.log('✅ Redis connected');
    } catch (error) {
      this.logger.error('❌ Redis connection failed', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from Redis...');
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  getClient(): Redis {
    return this.client;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
}
