import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Queue names used across the platform.
 * Isolated by domain for independent scaling and tuning.
 */
export const QUEUE_NAMES = {
  CAMPAIGN_PROCESSING: 'campaign-processing',
  MESSAGE_DELIVERY: 'message-delivery',
  INTELLIGENCE_COMPUTATION: 'intelligence-computation',
  SEGMENT_EVALUATION: 'segment-evaluation',
  EVENT_PROCESSING: 'event-processing',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('BULL_REDIS_HOST', 'localhost'),
          port: configService.get<number>('BULL_REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          attempts: configService.get<number>('BULL_DEFAULT_ATTEMPTS', 3),
          backoff: {
            type: 'exponential',
            delay: configService.get<number>('BULL_BACKOFF_DELAY', 1000),
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Register individual queues — activated in later phases
    // BullModule.registerQueue({ name: QUEUE_NAMES.CAMPAIGN_PROCESSING }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.MESSAGE_DELIVERY }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.INTELLIGENCE_COMPUTATION }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.SEGMENT_EVALUATION }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.EVENT_PROCESSING }),
    // BullModule.registerQueue({ name: QUEUE_NAMES.ANALYTICS_AGGREGATION }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
