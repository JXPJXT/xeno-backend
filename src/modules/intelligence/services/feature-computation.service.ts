import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Computes all 14 customer features from order, metric, and preference data.
 * Each feature is definition-driven — stored in feature_definitions table.
 * Results are stored in customer_features with version tracking.
 */
@Injectable()
export class FeatureComputationService {
  private readonly logger = new Logger(FeatureComputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeForTenant(tenantId: string): Promise<number> {
    const now = new Date();
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    const definitions = await this.prisma.featureDefinition.findMany({
      where: { tenantId, status: 'ACTIVE' },
    });

    let totalComputed = 0;

    for (const def of definitions) {
      // Resolve latest version for this feature definition
      const latestVersion = await this.prisma.featureVersion.findFirst({
        where: { tenantId, featureDefinitionId: def.id },
        orderBy: { version: 'desc' },
      });
      const versionNum = latestVersion?.version ?? 1;

      // Create run record linked to the resolved version
      const run = await this.prisma.featureComputationRun.create({
        data: {
          tenantId,
          featureDefinitionId: def.id,
          version: versionNum,
          status: 'RUNNING',
          startedAt: now,
        },
      });

      try {
        let count = 0;
        for (const customer of customers) {
          const value = await this.computeFeature(
            tenantId,
            customer.id,
            def.featureName,
          );
          if (value !== null) {
            await this.upsertFeature(
              tenantId,
              customer.id,
              def.featureName,
              value,
              versionNum,
              now,
            );
            count++;
          }
        }

        await this.prisma.featureComputationRun.update({
          where: { id: run.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            recordsProcessed: count,
          },
        });
        totalComputed += count;
      } catch (error: any) {
        await this.prisma.featureComputationRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: error.message,
          },
        });
        this.logger.error(
          `Failed computing ${def.featureName}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Computed ${totalComputed} features across ${customers.length} customers`,
    );
    return totalComputed;
  }

  async computeFeature(
    tenantId: string,
    customerId: string,
    featureName: string,
  ): Promise<number | null> {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, customerId, status: 'DELIVERED' },
      include: { items: true },
    });

    if (
      orders.length === 0 &&
      !['WHATSAPP_ENGAGEMENT', 'EMAIL_ENGAGEMENT'].includes(featureName)
    ) {
      return null;
    }

    const now = new Date();
    const totalRevenue = orders.reduce(
      (s: number, o: any) => s + Number(o.totalAmount),
      0,
    );
    const totalOrders = orders.length;

    switch (featureName) {
      case 'RFM_SCORE': {
        if (totalOrders === 0) return null;
        const dates = orders
          .map((o: any) => new Date(o.orderedAt).getTime())
          .sort();
        const days = Math.floor(
          (now.getTime() - dates[dates.length - 1]) / 86400000,
        );
        const r =
          days < 30 ? 5 : days < 90 ? 4 : days < 180 ? 3 : days < 365 ? 2 : 1;
        const f =
          totalOrders >= 10
            ? 5
            : totalOrders >= 6
              ? 4
              : totalOrders >= 3
                ? 3
                : totalOrders >= 2
                  ? 2
                  : 1;
        const m =
          totalRevenue >= 20000
            ? 5
            : totalRevenue >= 10000
              ? 4
              : totalRevenue >= 5000
                ? 3
                : totalRevenue >= 2000
                  ? 2
                  : 1;
        return Math.round((r * 0.4 + f * 0.35 + m * 0.25) * 20);
      }

      case 'TOTAL_SPEND':
        return totalRevenue;

      case 'TOTAL_ORDERS':
        return totalOrders;

      case 'AVG_ORDER_VALUE':
        return totalOrders > 0 ? totalRevenue / totalOrders : 0;

      case 'DAYS_SINCE_LAST_PURCHASE': {
        if (totalOrders === 0) return null;
        const dates = orders
          .map((o: any) => new Date(o.orderedAt).getTime())
          .sort();
        return Math.floor((now.getTime() - dates[dates.length - 1]) / 86400000);
      }

      case 'ORDER_FREQUENCY': {
        if (totalOrders <= 1) return 0;
        const dates = orders
          .map((o: any) => new Date(o.orderedAt).getTime())
          .sort();
        return Math.round(
          (dates[dates.length - 1] - dates[0]) / 86400000 / (totalOrders - 1),
        );
      }

      case 'DISCOUNT_AFFINITY': {
        const discountOrders = orders.filter(
          (o: any) => Number(o.discountAmount) > 0,
        ).length;
        return totalOrders > 0
          ? Math.round((discountOrders / totalOrders) * 100) / 100
          : 0;
      }

      case 'PREMIUM_BUYER_SCORE': {
        const avgPrice = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        return avgPrice > 5000
          ? 0.9
          : avgPrice > 3000
            ? 0.7
            : avgPrice > 1500
              ? 0.5
              : avgPrice > 500
                ? 0.3
                : 0.1;
      }

      case 'CATEGORY_DIVERSITY': {
        const categories = new Set<string>();
        for (const order of orders) {
          for (const item of order.items) {
            if (item.category) categories.add(item.category);
          }
        }
        return Math.min(1, categories.size / 5); // normalize to 0-1 (5+ categories = 1.0)
      }

      case 'WEEKEND_BUYER_SCORE': {
        const weekendOrders = orders.filter((o: any) => {
          const day = new Date(o.orderedAt).getDay();
          return day === 0 || day === 6;
        }).length;
        return totalOrders > 0
          ? Math.round((weekendOrders / totalOrders) * 100) / 100
          : 0;
      }

      case 'WHATSAPP_ENGAGEMENT': {
        const pref = await this.prisma.customerPreference.findFirst({
          where: { tenantId, customerId },
        });
        return pref?.whatsappEnabled ? 0.7 : 0.2;
      }

      case 'EMAIL_ENGAGEMENT': {
        const pref = await this.prisma.customerPreference.findFirst({
          where: { tenantId, customerId },
        });
        return pref?.emailEnabled ? 0.6 : 0.1;
      }

      case 'PURCHASE_RECENCY': {
        if (totalOrders === 0) return null;
        const dates = orders
          .map((o: any) => new Date(o.orderedAt).getTime())
          .sort();
        const days = Math.floor(
          (now.getTime() - dates[dates.length - 1]) / 86400000,
        );
        return days < 30
          ? 1.0
          : days < 90
            ? 0.75
            : days < 180
              ? 0.5
              : days < 365
                ? 0.25
                : 0.1;
      }

      case 'LIFETIME_VALUE':
        return totalRevenue * 1.5;

      default:
        return null;
    }
  }

  private async upsertFeature(
    tenantId: string,
    customerId: string,
    featureName: string,
    value: number,
    version: number,
    computedAt: Date,
  ) {
    const existing = await this.prisma.customerFeature.findFirst({
      where: { tenantId, customerId, featureName },
    });

    if (existing) {
      await this.prisma.customerFeature.update({
        where: { id: existing.id },
        data: { featureValue: value, featureVersion: version, computedAt },
      });
    } else {
      await this.prisma.customerFeature.create({
        data: {
          tenantId,
          customerId,
          featureName,
          featureValue: value,
          featureVersion: version,
          computedAt,
        },
      });
    }
  }
}
