import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../core/prisma/prisma.service';
import { QUEUE_NAMES } from '../../core/queue/queue.module';
import { CommunicationStatus, DeliveryEventType } from '@prisma/client';

export interface DeliveryJob {
  logId: string;
  tenantId: string;
  campaignId: string;
  customerId: string;
  channel: string;
  recipient: string;
  message: string;
  subject?: string;
}

export interface CallbackPayload {
  logId: string;
  providerMessageId?: string;
  eventType: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'FAILED';
  errorCode?: string;
  errorMessage?: string;
  occurredAt: string;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private readonly channelServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.MESSAGE_DELIVERY)
    private readonly deliveryQueue: Queue,
  ) {
    this.channelServiceUrl =
      process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Enqueue a delivery job for a single communication log entry.
   */
  async enqueueDelivery(job: DeliveryJob): Promise<void> {
    await this.deliveryQueue.add('deliver', job, {
      jobId: job.logId, // idempotent
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log(`Enqueued delivery job for log ${job.logId}`);
  }

  /**
   * Called by the BullMQ processor. Posts to the channel service.
   */
  async dispatchToChannelService(job: DeliveryJob): Promise<void> {
    // Transition log to SENT
    await this.prisma.communicationLog.update({
      where: { id: job.logId },
      data: { status: CommunicationStatus.SENT, sentAt: new Date() },
    });

    const callbackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/communications/callbacks`;

    const response = await fetch(`${this.channelServiceUrl}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logId: job.logId,
        recipient: job.recipient,
        message: job.message,
        channel: job.channel,
        callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Channel service returned ${response.status} for log ${job.logId}`,
      );
    }

    this.logger.log(
      `Dispatched log ${job.logId} to channel service (${job.channel})`,
    );
  }

  /**
   * Processes an inbound callback from the channel service.
   * Updates the CommunicationLog status and writes a DeliveryReceipt.
   */
  async processCallback(payload: CallbackPayload): Promise<void> {
    const log = await this.prisma.communicationLog.findUnique({
      where: { id: payload.logId },
    });

    if (!log) {
      this.logger.warn(`Callback received for unknown logId: ${payload.logId}`);
      throw new NotFoundException(
        `Communication log ${payload.logId} not found`,
      );
    }

    const occurredAt = new Date(payload.occurredAt);

    // Map event type to CommunicationStatus and timestamps
    const statusMap: Record<string, CommunicationStatus> = {
      DELIVERED: CommunicationStatus.DELIVERED,
      OPENED: CommunicationStatus.OPENED,
      CLICKED: CommunicationStatus.CLICKED,
      FAILED: CommunicationStatus.FAILED,
    };

    const newStatus = statusMap[payload.eventType];
    if (!newStatus) {
      this.logger.warn(`Unknown event type received: ${payload.eventType}`);
      return;
    }

    // Update communication log status and timestamps
    const updateData: any = { status: newStatus };
    if (payload.eventType === 'DELIVERED') updateData.deliveredAt = occurredAt;
    if (payload.eventType === 'FAILED') {
      updateData.failedAt = occurredAt;
      updateData.errorCode = payload.errorCode ?? 'UNKNOWN';
      updateData.errorMessage = payload.errorMessage ?? null;
    }

    await this.prisma.communicationLog.update({
      where: { id: log.id },
      data: updateData,
    });

    // Map event type to DeliveryEventType enum
    const receiptEventMap: Record<string, DeliveryEventType> = {
      DELIVERED: DeliveryEventType.DELIVERED,
      OPENED: DeliveryEventType.OPENED,
      CLICKED: DeliveryEventType.CLICKED,
      FAILED: DeliveryEventType.FAILED,
    };

    // Write immutable delivery receipt
    await this.prisma.deliveryReceipt.create({
      data: {
        tenantId: log.tenantId,
        communicationLogId: log.id,
        eventType: receiptEventMap[payload.eventType],
        rawPayload: payload as any,
        metadata: { providerMessageId: payload.providerMessageId ?? null },
        occurredAt,
        processedAt: new Date(),
      },
    });

    this.logger.log(
      `Processed ${payload.eventType} callback for log ${payload.logId}`,
    );
  }

  /**
   * Get communication logs for a campaign.
   */
  async getLogsForCampaign(tenantId: string, campaignId: string) {
    return this.prisma.communicationLog.findMany({
      where: { tenantId, campaignId },
      include: { deliveryReceipts: { orderBy: { occurredAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
