import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../core/queue/queue.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceProcessor } from './intelligence.processor';
import {
  CustomerMetricsService,
  FeatureComputationService,
  EngagementService,
  ChurnRiskService,
  PersonaAssignmentService,
  SegmentResolverService,
  CategoryAffinityService,
} from './services';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.INTELLIGENCE_COMPUTATION }),
  ],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceService,
    IntelligenceProcessor,
    CustomerMetricsService,
    FeatureComputationService,
    EngagementService,
    ChurnRiskService,
    PersonaAssignmentService,
    SegmentResolverService,
    CategoryAffinityService,
  ],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
