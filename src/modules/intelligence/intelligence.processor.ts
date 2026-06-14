import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../core/queue/queue.module';
import { IntelligenceService } from './intelligence.service';
import {
  CustomerMetricsService,
  FeatureComputationService,
  EngagementService,
  ChurnRiskService,
  PersonaAssignmentService,
  SegmentResolverService,
} from './services';

export type IntelligenceJobData = {
  tenantId: string;
  type:
    | 'full'
    | 'metrics'
    | 'features'
    | 'engagement'
    | 'churn'
    | 'personas'
    | 'segments';
  customerId?: string;
};

@Processor(QUEUE_NAMES.INTELLIGENCE_COMPUTATION)
export class IntelligenceProcessor extends WorkerHost {
  private readonly logger = new Logger(IntelligenceProcessor.name);

  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly metricsService: CustomerMetricsService,
    private readonly featureService: FeatureComputationService,
    private readonly engagementService: EngagementService,
    private readonly churnService: ChurnRiskService,
    private readonly personaService: PersonaAssignmentService,
    private readonly segmentService: SegmentResolverService,
  ) {
    super();
  }

  async process(job: Job<IntelligenceJobData>) {
    this.logger.log(
      `Processing intelligence job: ${job.name} (${job.data.type}) for tenant ${job.data.tenantId}`,
    );

    try {
      switch (job.data.type) {
        case 'full':
          return await this.intelligenceService.computeAll(job.data.tenantId);
        case 'metrics':
          return await this.metricsService.computeForTenant(job.data.tenantId);
        case 'features':
          return await this.featureService.computeForTenant(job.data.tenantId);
        case 'engagement':
          return await this.engagementService.computeForTenant(
            job.data.tenantId,
          );
        case 'churn':
          return await this.churnService.computeForTenant(job.data.tenantId);
        case 'personas':
          return await this.personaService.computeForTenant(job.data.tenantId);
        case 'segments':
          return await this.segmentService.resolveForTenant(job.data.tenantId);
        default:
          throw new Error(`Unknown job type: ${String(job.data.type)}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Intelligence job failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
