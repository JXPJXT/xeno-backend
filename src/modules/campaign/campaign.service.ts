import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CommunicationService,
  DeliveryJob,
} from '../communication/communication.service';
import {
  CampaignStatus,
  CampaignAudienceStatus,
  CommunicationStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * CampaignService — handles campaign lifecycle:
 *   Create (draft) → Preview → Launch → Results
 *
 * Launch:
 *   1. Resolve audience from linked segment (using pre-computed segment_customers)
 *   2. Snapshot audience into campaign_audiences
 *   3. Create communication_logs for each audience member
 *   4. Enqueue delivery jobs to BullMQ message-delivery queue
 *
 * Preview:
 *   Render personalized messages for a sample of customers
 *   using their attributes, preferences, features, and affinities.
 *
 * Results:
 *   Aggregate CommunicationLog statuses for the campaign.
 */

export interface CreateCampaignDto {
  name: string;
  description?: string;
  channel: string;
  segmentId: string;
  messageSubject?: string;
  messageBody: string;
}

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}

  // ──────────────────────────────────────
  // LIST
  // ──────────────────────────────────────

  async findAll(tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        segment: { select: { id: true, name: true } },
        _count: {
          select: {
            campaignMessages: true,
            campaignAudiences: true,
            communicationLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ──────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────

  async create(tenantId: string, dto: CreateCampaignDto) {
    // Verify segment exists
    const segment = await this.prisma.segment.findFirst({
      where: { id: dto.segmentId, tenantId, deletedAt: null },
    });
    if (!segment) {
      throw new NotFoundException(`Segment ${dto.segmentId} not found`);
    }

    // Create campaign + default message in a transaction
    return this.prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          channel: dto.channel as any,
          segmentId: dto.segmentId,
          status: CampaignStatus.DRAFT,
        },
      });

      await tx.campaignMessage.create({
        data: {
          tenantId,
          campaignId: campaign.id,
          variantName: 'default',
          channel: dto.channel as any,
          subject: dto.messageSubject ?? null,
          body: dto.messageBody,
        },
      });

      this.logger.log(
        `Campaign ${campaign.id} created in DRAFT for tenant ${tenantId}`,
      );
      return campaign;
    });
  }

  // ──────────────────────────────────────
  // PREVIEW
  // ──────────────────────────────────────

  async preview(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: {
        campaignMessages: true,
        segment: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }
    if (!campaign.segmentId) {
      throw new BadRequestException('Campaign has no segment assigned');
    }

    // Get sample customers from segment (up to 5)
    const segmentMembers = await this.prisma.segmentCustomer.findMany({
      where: { tenantId, segmentId: campaign.segmentId },
      take: 5,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            city: true,
          },
        },
      },
    });

    if (segmentMembers.length === 0) {
      return {
        campaignId,
        campaignName: campaign.name,
        segmentName: campaign.segment?.name ?? 'Unknown',
        audienceSize: 0,
        previews: [],
        message: 'No customers in segment. Run intelligence compute first.',
      };
    }

    // Full audience count
    const audienceCount = await this.prisma.segmentCustomer.count({
      where: { tenantId, segmentId: campaign.segmentId },
    });

    const message = campaign.campaignMessages[0];
    if (!message) {
      throw new BadRequestException('Campaign has no messages configured');
    }

    // Render personalized previews for each sample customer
    const previews = await Promise.all(
      segmentMembers.map(async (sm) => {
        const enrichment = await this.loadCustomerEnrichment(
          tenantId,
          sm.customerId,
        );
        const renderedBody = this.renderTemplate(message.body, {
          ...enrichment,
          firstName: sm.customer.firstName ?? 'Customer',
          lastName: sm.customer.lastName ?? '',
          email: sm.customer.email ?? '',
          city: sm.customer.city ?? '',
        });
        const renderedSubject = message.subject
          ? this.renderTemplate(message.subject, {
              ...enrichment,
              firstName: sm.customer.firstName ?? 'Customer',
              lastName: sm.customer.lastName ?? '',
            })
          : null;

        return {
          customerId: sm.customerId,
          customerName:
            `${sm.customer.firstName ?? ''} ${sm.customer.lastName ?? ''}`.trim(),
          email: sm.customer.email,
          renderedSubject,
          renderedBody,
          enrichment,
        };
      }),
    );

    return {
      campaignId,
      campaignName: campaign.name,
      channel: campaign.channel,
      segmentName: campaign.segment?.name ?? 'Unknown',
      audienceSize: audienceCount,
      sampleSize: previews.length,
      previews,
    };
  }

  // ──────────────────────────────────────
  // LAUNCH
  // ──────────────────────────────────────

  async launch(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
      include: { campaignMessages: true },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }
    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException(
        `Campaign is in ${campaign.status} status. Only DRAFT campaigns can be launched.`,
      );
    }
    if (!campaign.segmentId) {
      throw new BadRequestException('Campaign has no segment assigned');
    }

    const message = campaign.campaignMessages[0];
    if (!message) {
      throw new BadRequestException('Campaign has no messages configured');
    }

    // 1. Resolve audience from segment_customers
    const segmentMembers = await this.prisma.segmentCustomer.findMany({
      where: { tenantId, segmentId: campaign.segmentId },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            city: true,
          },
        },
      },
    });

    if (segmentMembers.length === 0) {
      throw new BadRequestException(
        'Segment has no customers. Run intelligence compute first.',
      );
    }

    // 2-4. Snapshot audience, create logs, enqueue jobs — all in a transaction
    const launchResult = await this.prisma.$transaction(async (tx) => {
      // Update campaign status to ACTIVE
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.ACTIVE,
          launchedAt: new Date(),
        },
      });

      const audienceRecords: Array<{
        tenantId: string;
        campaignId: string;
        customerId: string;
        segmentId: string;
        status: CampaignAudienceStatus;
      }> = [];

      const logRecords: Array<{
        id: string;
        tenantId: string;
        campaignId: string;
        messageId: string;
        customerId: string;
        channel: any;
        status: CommunicationStatus;
        idempotencyKey: string;
      }> = [];

      const deliveryJobs: DeliveryJob[] = [];

      for (const sm of segmentMembers) {
        const logId = randomUUID();
        const recipient = this.getRecipientForChannel(
          campaign.channel,
          sm.customer,
        );

        if (!recipient) continue; // Skip customers with no valid recipient for channel

        // Render personalized message
        const enrichment = await this.loadCustomerEnrichment(
          tenantId,
          sm.customerId,
        );
        const renderedBody = this.renderTemplate(message.body, {
          ...enrichment,
          firstName: sm.customer.firstName ?? 'Customer',
          lastName: sm.customer.lastName ?? '',
          email: sm.customer.email ?? '',
          city: sm.customer.city ?? '',
        });

        // 2. Audience snapshot
        audienceRecords.push({
          tenantId,
          campaignId,
          customerId: sm.customerId,
          segmentId: campaign.segmentId!,
          status: CampaignAudienceStatus.INCLUDED,
        });

        // 3. Communication log
        logRecords.push({
          id: logId,
          tenantId,
          campaignId,
          messageId: message.id,
          customerId: sm.customerId,
          channel: campaign.channel,
          status: CommunicationStatus.QUEUED,
          idempotencyKey: `${campaignId}-${sm.customerId}-${message.id}`,
        });

        // 4. Delivery job
        deliveryJobs.push({
          logId,
          tenantId,
          campaignId,
          customerId: sm.customerId,
          channel: campaign.channel,
          recipient,
          message: renderedBody,
          subject: message.subject ?? undefined,
        });
      }

      // Batch insert audience snapshots
      if (audienceRecords.length > 0) {
        await tx.campaignAudience.createMany({
          data: audienceRecords,
          skipDuplicates: true,
        });
      }

      // Batch insert communication logs
      if (logRecords.length > 0) {
        await tx.communicationLog.createMany({
          data: logRecords,
          skipDuplicates: true,
        });
      }

      return { audienceSize: audienceRecords.length, deliveryJobs };
    });

    // Enqueue delivery jobs outside the transaction
    for (const job of launchResult.deliveryJobs) {
      await this.communicationService.enqueueDelivery(job);
    }

    this.logger.log(
      `Campaign ${campaignId} launched. Audience: ${launchResult.audienceSize}, Jobs queued: ${launchResult.deliveryJobs.length}`,
    );

    return {
      campaignId,
      status: 'LAUNCHED',
      audienceSize: launchResult.audienceSize,
      jobsQueued: launchResult.deliveryJobs.length,
      launchedAt: new Date().toISOString(),
    };
  }

  // ──────────────────────────────────────
  // RESULTS
  // ──────────────────────────────────────

  async results(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        launchedAt: true,
        channel: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Aggregate communication log statuses
    const logs = await this.prisma.communicationLog.findMany({
      where: { tenantId, campaignId },
      select: { status: true },
    });

    const audienceCount = await this.prisma.campaignAudience.count({
      where: { tenantId, campaignId },
    });

    const counts = {
      total: logs.length,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      queued: 0,
    };

    for (const log of logs) {
      switch (log.status) {
        case CommunicationStatus.QUEUED:
        case CommunicationStatus.SENDING:
          counts.queued++;
          break;
        case CommunicationStatus.SENT:
          counts.sent++;
          break;
        case CommunicationStatus.DELIVERED:
          counts.delivered++;
          break;
        case CommunicationStatus.OPENED:
          counts.opened++;
          break;
        case CommunicationStatus.CLICKED:
          counts.clicked++;
          break;
        case CommunicationStatus.FAILED:
        case CommunicationStatus.BOUNCED:
          counts.failed++;
          break;
      }
    }

    return {
      campaignId,
      campaignName: campaign.name,
      status: campaign.status,
      channel: campaign.channel,
      launchedAt: campaign.launchedAt,
      audienceSize: audienceCount,
      metrics: counts,
    };
  }

  // ──────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────

  /**
   * Loads enrichment data for personalization:
   * metrics, features, personas, preferences, affinities.
   */
  private async loadCustomerEnrichment(
    tenantId: string,
    customerId: string,
  ): Promise<Record<string, any>> {
    const [metric, features, personaAssignments, preference, affinities] =
      await Promise.all([
        this.prisma.customerMetric.findFirst({
          where: { tenantId, customerId },
        }),
        this.prisma.customerFeature.findMany({
          where: { tenantId, customerId },
          select: { featureName: true, featureValue: true },
        }),
        this.prisma.customerPersona.findMany({
          where: { tenantId, customerId },
          include: { persona: { select: { name: true } } },
        }),
        this.prisma.customerPreference.findFirst({
          where: { tenantId, customerId },
        }),
        this.prisma.customerCategoryAffinity.findMany({
          where: { tenantId, customerId },
          select: { category: true, affinityScore: true },
          orderBy: { affinityScore: 'desc' },
          take: 3,
        }),
      ]);

    const enrichment: Record<string, any> = {};

    // Metrics
    if (metric) {
      enrichment.totalOrders = metric.totalOrders;
      enrichment.totalRevenue = Number(metric.totalRevenue);
      enrichment.avgOrderValue = Number(metric.avgOrderValue);
      enrichment.lifetimeValue = Number(metric.lifetimeValue);
    }

    // Features
    for (const f of features) {
      enrichment[`feature_${f.featureName}`] = Number(f.featureValue);
    }

    // Personas
    const personas = personaAssignments.map(
      (pa: any) => pa.persona.name as string,
    );
    enrichment.personas = personas.join(', ');
    enrichment.primaryPersona = personas[0] ?? 'Valued Customer';

    // Preferences
    if (preference) {
      enrichment.preferredChannel = preference.preferredChannel ?? 'EMAIL';
    }

    // Top category affinities
    const topCategories = affinities.map((a: any) => a.category as string);
    enrichment.topCategories = topCategories.join(', ');
    enrichment.topCategory = topCategories[0] ?? '';

    return enrichment;
  }

  /**
   * Simple Mustache-style template renderer.
   * Replaces {{key}} with values from the context map.
   */
  private renderTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const val = context[key];
      if (val === undefined || val === null) return match; // Leave unresolved
      return String(val);
    });
  }

  /**
   * Get the appropriate recipient address for the campaign channel.
   */
  private getRecipientForChannel(
    channel: string,
    customer: { email?: string | null; phone?: string | null },
  ): string | null {
    switch (channel) {
      case 'EMAIL':
        return customer.email ?? null;
      case 'SMS':
      case 'WHATSAPP':
        return customer.phone ?? null;
      case 'PUSH':
        return customer.email ?? null; // Push uses device token, fallback to email
      default:
        return customer.email ?? null;
    }
  }

  async getCampaignAnalytics(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const [
      totalSent,
      distinctDelivered,
      distinctOpened,
      distinctClicked,
      revAgg,
    ] = await Promise.all([
      this.prisma.communicationLog.count({
        where: { tenantId, campaignId, sentAt: { not: null } },
      }),
      this.prisma.deliveryReceipt.findMany({
        where: {
          tenantId,
          communicationLog: { campaignId },
          eventType: { in: ['DELIVERED', 'OPENED', 'CLICKED'] },
        },
        select: { communicationLogId: true },
        distinct: ['communicationLogId'],
      }),
      this.prisma.deliveryReceipt.findMany({
        where: {
          tenantId,
          communicationLog: { campaignId },
          eventType: { in: ['OPENED', 'CLICKED'] },
        },
        select: { communicationLogId: true },
        distinct: ['communicationLogId'],
      }),
      this.prisma.deliveryReceipt.findMany({
        where: {
          tenantId,
          communicationLog: { campaignId },
          eventType: 'CLICKED',
        },
        select: { communicationLogId: true },
        distinct: ['communicationLogId'],
      }),
      this.prisma.revenueAttribution.aggregate({
        where: { tenantId, campaignId },
        _sum: { revenue: true },
        _count: { id: true },
      }),
    ]);

    const totalDelivered = distinctDelivered.length;
    const totalOpened = distinctOpened.length;
    const totalClicked = distinctClicked.length;
    const totalConverted = revAgg._count.id || 0;
    const revenueGenerated = Number(revAgg._sum.revenue || 0);

    const openRate = totalDelivered > 0 ? totalOpened / totalDelivered : 0;
    const clickThroughRate =
      totalDelivered > 0 ? totalClicked / totalDelivered : 0;
    const conversionRate =
      totalDelivered > 0 ? totalConverted / totalDelivered : 0;

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalConverted,
      revenueGenerated,
      openRate,
      clickThroughRate,
      conversionRate,
    };
  }

  async getOverviewAnalytics(tenantId: string) {
    const [
      totalCustomers,
      totalOrders,
      totalCampaigns,
      orderAgg,
      attrAgg,
      distinctDelivered,
      distinctOpened,
      distinctClicked,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.order.count({ where: { tenantId } }),
      this.prisma.campaign.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.order.aggregate({
        where: { tenantId },
        _sum: { totalAmount: true },
      }),
      this.prisma.revenueAttribution.aggregate({
        where: { tenantId },
        _sum: { revenue: true },
      }),
      this.prisma.deliveryReceipt.findMany({
        where: {
          tenantId,
          eventType: { in: ['DELIVERED', 'OPENED', 'CLICKED'] },
        },
        select: { communicationLogId: true },
        distinct: ['communicationLogId'],
      }),
      this.prisma.deliveryReceipt.findMany({
        where: {
          tenantId,
          eventType: { in: ['OPENED', 'CLICKED'] },
        },
        select: { communicationLogId: true },
        distinct: ['communicationLogId'],
      }),
      this.prisma.deliveryReceipt.findMany({
        where: {
          tenantId,
          eventType: 'CLICKED',
        },
        select: { communicationLogId: true },
        distinct: ['communicationLogId'],
      }),
    ]);

    return {
      totalCustomers,
      totalOrders,
      totalCampaigns,
      totalRevenue: Number(orderAgg._sum.totalAmount || 0),
      totalAttributedRevenue: Number(attrAgg._sum.revenue || 0),
      totalDelivered: distinctDelivered.length,
      totalOpened: distinctOpened.length,
      totalClicked: distinctClicked.length,
    };
  }
}
