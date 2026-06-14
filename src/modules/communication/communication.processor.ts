import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../core/queue/queue.module';
import { CommunicationService, DeliveryJob } from './communication.service';

@Processor(QUEUE_NAMES.MESSAGE_DELIVERY)
export class CommunicationProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunicationProcessor.name);

  constructor(private readonly communicationService: CommunicationService) {
    super();
  }

  async process(job: Job<DeliveryJob>): Promise<void> {
    this.logger.log(
      `Processing delivery job ${job.id} for log ${job.data.logId}`,
    );
    await this.communicationService.dispatchToChannelService(job.data);
  }
}
