import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Rule-based churn risk engine.
 * Factors: days since purchase, frequency decline, engagement decline, spending decline.
 * Output: 0-1 risk score.
 */
@Injectable()
export class ChurnRiskService {
  private readonly logger = new Logger(ChurnRiskService.name);

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

    this.logger.log(`Computed churn risk for ${processed} customers`);
    return processed;
  }

  async computeForCustomer(
    tenantId: string,
    customerId: string,
  ): Promise<number> {
    const now = new Date();
    const metric = await this.prisma.customerMetric.findFirst({
      where: { tenantId, customerId },
    });

    if (!metric) return 0.5; // no data = moderate risk

    // Factor 1: Recency risk (days since last order)
    const days = metric.daysSinceLastOrder ?? 999;
    const recencyRisk =
      days > 365
        ? 0.95
        : days > 180
          ? 0.8
          : days > 90
            ? 0.6
            : days > 30
              ? 0.3
              : 0.1;

    // Factor 2: Frequency risk (order count vs time span)
    const totalOrders = metric.totalOrders;
    const frequencyRisk =
      totalOrders <= 1
        ? 0.7
        : totalOrders <= 2
          ? 0.5
          : totalOrders <= 3
            ? 0.3
            : 0.1;

    // Factor 3: Engagement risk
    const engagement = Number(metric.engagementScore ?? 50);
    const engagementRisk =
      engagement < 20
        ? 0.8
        : engagement < 40
          ? 0.6
          : engagement < 60
            ? 0.4
            : engagement < 80
              ? 0.2
              : 0.05;

    // Factor 4: Spending decline risk
    // Simple: low AOV relative to total = possibly declining
    const aov = Number(metric.avgOrderValue ?? 0);
    const spendRisk =
      aov < 500 ? 0.6 : aov < 1000 ? 0.4 : aov < 2000 ? 0.25 : 0.1;

    // Weighted combination
    const churnScore =
      Math.round(
        (recencyRisk * 0.4 +
          frequencyRisk * 0.25 +
          engagementRisk * 0.2 +
          spendRisk * 0.15) *
          10000,
      ) / 10000; // 4 decimal places, 0-1

    // Update metrics
    await this.prisma.customerMetric.update({
      where: { id: metric.id },
      data: { churnRiskScore: churnScore },
    });

    // Store as feature
    const existing = await this.prisma.customerFeature.findFirst({
      where: { tenantId, customerId, featureName: 'CHURN_RISK_SCORE' },
    });
    if (existing) {
      await this.prisma.customerFeature.update({
        where: { id: existing.id },
        data: { featureValue: churnScore, computedAt: now },
      });
    } else {
      await this.prisma.customerFeature.create({
        data: {
          tenantId,
          customerId,
          featureName: 'CHURN_RISK_SCORE',
          featureValue: churnScore,
          featureVersion: 1,
          computedAt: now,
        },
      });
    }

    return churnScore;
  }
}
