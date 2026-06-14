import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import * as Joi from 'joi';

import { PrismaModule } from './core/prisma/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { QueueModule } from './core/queue/queue.module';
import { LoggerModule } from './core/logger/logger.module';
import { TenantContextModule } from './core/tenant-context/tenant-context.module';
import { HealthController } from './core/health/health.controller';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { DecisioningModule } from './modules/decisioning/decisioning.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    // Global configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        // Application
        APP_PORT: Joi.number().default(3000),
        APP_ENV: Joi.string()
          .valid('development', 'staging', 'production')
          .default('development'),
        APP_NAME: Joi.string().default('xeno-platform'),

        // Database
        DATABASE_URL: Joi.string().required(),

        // Redis
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_URL: Joi.string().optional(),

        // JWT
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRY: Joi.string().default('7d'),

        // BullMQ
        BULL_REDIS_HOST: Joi.string().default('localhost'),
        BULL_REDIS_PORT: Joi.number().default(6379),

        // Logging
        LOG_LEVEL: Joi.string()
          .valid('error', 'warn', 'log', 'debug', 'verbose')
          .default('debug'),
      }),
    }),

    // Core infrastructure
    TenantContextModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    LoggerModule,
    TerminusModule,

    // Feature modules
    AuthModule,
    CustomerModule,
    ProductModule,
    OrderModule,
    IntelligenceModule,
    CommunicationModule,
    CampaignModule,
    DecisioningModule,
    ChatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
