import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Computes engagement scores (0-100) per channel and overall.
 * Uses communication_logs, customer_preferences, and customer_channels.
 */
@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeForTenant(tenantId: string): Promise<number> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    let processed = 0;
    for (const customer of customers) {
      await this.computeForCustomer(tenantId, customer.id);
      processed++;
    }

    this.logger.log(`Computed engagement for ${processed} customers`);
    return processed;
  }

  async computeForCustomer(tenantId: string, customerId: string) {
    // Pull communication logs for this customer
    const logs = await this.prisma.communicationLog.findMany({
      where: { tenantId, customerId },
      select: { channel: true, status: true },
    });

    // Pull preferences and channels
    const preferences = await this.prisma.customerPreference.findFirst({
      where: { tenantId, customerId },
    });

    const channels = await this.prisma.customerChannel.findMany({
      where: { tenantId, customerId },
    });

    // Compute per-channel engagement
    const emailLogs = logs.filter((l: any) => l.channel === 'EMAIL');
    const smsLogs = logs.filter((l: any) => l.channel === 'SMS');
    const whatsappLogs = logs.filter((l: any) => l.channel === 'WHATSAPP');

    const emailScore = this.computeChannelScore(
      emailLogs,
      preferences?.emailEnabled ?? true,
      channels.some((c: any) => c.channelType === 'EMAIL'),
    );
    const smsScore = this.computeChannelScore(
      smsLogs,
      preferences?.smsEnabled ?? true,
      channels.some((c: any) => c.channelType === 'SMS'),
    );
    const whatsappScore = this.computeChannelScore(
      whatsappLogs,
      preferences?.whatsappEnabled ?? true,
      channels.some((c: any) => c.channelType === 'WHATSAPP'),
    );

    // Overall = weighted average
    const overallScore = Math.round(
      emailScore * 0.4 + smsScore * 0.3 + whatsappScore * 0.3,
    );

    // Store as features
    const now = new Date();
    for (const [name, value] of [
      ['EMAIL_ENGAGEMENT_SCORE', emailScore],
      ['SMS_ENGAGEMENT_SCORE', smsScore],
      ['WHATSAPP_ENGAGEMENT_SCORE', whatsappScore],
      ['OVERALL_ENGAGEMENT_SCORE', overallScore],
    ] as const) {
      await this.upsertFeature(tenantId, customerId, name, value, now);
    }

    // Also store overall in customer_metrics
    const existing = await this.prisma.customerMetric.findFirst({
      where: { tenantId, customerId },
    });
    if (existing) {
      await this.prisma.customerMetric.update({
        where: { id: existing.id },
        data: { engagementScore: overallScore },
      });
    }

    return { emailScore, smsScore, whatsappScore, overallScore };
  }

  private computeChannelScore(
    logs: { status: string }[],
    prefEnabled: boolean,
    hasChannel: boolean,
  ): number {
    if (!prefEnabled || !hasChannel) return 10; // minimal baseline

    const total = logs.length;
    if (total === 0) return 30; // subscribed but no comms yet

    const delivered = logs.filter(
      (l) =>
        l.status === 'DELIVERED' ||
        l.status === 'OPENED' ||
        l.status === 'CLICKED',
    ).length;
    const opened = logs.filter(
      (l) => l.status === 'OPENED' || l.status === 'CLICKED',
    ).length;
    const clicked = logs.filter((l) => l.status === 'CLICKED').length;

    const deliveryRate = delivered / total;
    const openRate = total > 0 ? opened / total : 0;
    const clickRate = total > 0 ? clicked / total : 0;

    // Weighted score
    return Math.min(
      100,
      Math.round(
        deliveryRate * 20 +
          openRate * 40 +
          clickRate * 40 +
          (hasChannel ? 10 : 0) +
          (prefEnabled ? 10 : 0),
      ),
    );
  }

  private async upsertFeature(
    tenantId: string,
    customerId: string,
    name: string,
    value: number,
    now: Date,
  ) {
    const existing = await this.prisma.customerFeature.findFirst({
      where: { tenantId, customerId, featureName: name },
    });
    if (existing) {
      await this.prisma.customerFeature.update({
        where: { id: existing.id },
        data: { featureValue: value, computedAt: now },
      });
    } else {
      await this.prisma.customerFeature.create({
        data: {
          tenantId,
          customerId,
          featureName: name,
          featureValue: value,
          featureVersion: 1,
          computedAt: now,
        },
      });
    }
  }
}
