import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Computes customer metrics from raw order data.
 * Produces: totalOrders, totalRevenue, avgOrderValue, RFM scores,
 * lifetimeValue, daysSinceLastOrder, orderFrequencyDays.
 */
@Injectable()
export class CustomerMetricsService {
  private readonly logger = new Logger(CustomerMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeForTenant(tenantId: string): Promise<number> {
    const now = new Date();

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    let processed = 0;

    for (const customer of customers) {
      await this.computeForCustomer(tenantId, customer.id, now);
      processed++;
    }

    this.logger.log(
      `Computed metrics for ${processed} customers in tenant ${tenantId}`,
    );
    return processed;
  }

  async computeForCustomer(
    tenantId: string,
    customerId: string,
    now = new Date(),
  ) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, customerId, status: 'DELIVERED' },
      orderBy: { orderedAt: 'asc' },
      select: { totalAmount: true, orderedAt: true, discountAmount: true },
    });

    const totalOrders = orders.length;
    if (totalOrders === 0) return null;

    const totalRevenue = orders.reduce(
      (sum: number, o: any) => sum + Number(o.totalAmount),
      0,
    );
    const avgOrderValue = totalRevenue / totalOrders;
    const orderDates = orders
      .map((o: any) => new Date(o.orderedAt).getTime())
      .sort();
    const firstOrderAt = new Date(orderDates[0]);
    const lastOrderAt = new Date(orderDates[orderDates.length - 1]);
    const daysSinceLastOrder = Math.floor(
      (now.getTime() - lastOrderAt.getTime()) / 86400000,
    );

    let orderFrequencyDays = 0;
    if (totalOrders > 1) {
      orderFrequencyDays =
        (lastOrderAt.getTime() - firstOrderAt.getTime()) /
        86400000 /
        (totalOrders - 1);
    }

    // RFM scoring (1-5)
    const recencyScore =
      daysSinceLastOrder < 30
        ? 5
        : daysSinceLastOrder < 90
          ? 4
          : daysSinceLastOrder < 180
            ? 3
            : daysSinceLastOrder < 365
              ? 2
              : 1;
    const frequencyScore =
      totalOrders >= 10
        ? 5
        : totalOrders >= 6
          ? 4
          : totalOrders >= 3
            ? 3
            : totalOrders >= 2
              ? 2
              : 1;
    const monetaryScore =
      totalRevenue >= 20000
        ? 5
        : totalRevenue >= 10000
          ? 4
          : totalRevenue >= 5000
            ? 3
            : totalRevenue >= 2000
              ? 2
              : 1;
    const rfmCombined = Math.round(
      (recencyScore * 0.4 + frequencyScore * 0.35 + monetaryScore * 0.25) * 20,
    );

    const lifetimeValue = totalRevenue * 1.5;

    // Predicted next order
    let predictedNextOrderAt: Date | null = null;
    if (orderFrequencyDays > 0) {
      predictedNextOrderAt = new Date(
        lastOrderAt.getTime() + orderFrequencyDays * 86400000,
      );
    }

    const data = {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      firstOrderAt,
      lastOrderAt,
      daysSinceLastOrder,
      orderFrequencyDays,
      rfmRecencyScore: recencyScore,
      rfmFrequencyScore: frequencyScore,
      rfmMonetaryScore: monetaryScore,
      rfmCombinedScore: rfmCombined,
      lifetimeValue,
      predictedNextOrderAt,
      computedAt: now,
    };

    // Upsert metrics
    const existing = await this.prisma.customerMetric.findFirst({
      where: { tenantId, customerId },
    });

    let metrics;
    if (existing) {
      metrics = await this.prisma.customerMetric.update({
        where: { id: existing.id },
        data,
      });
    } else {
      metrics = await this.prisma.customerMetric.create({
        data: { tenantId, customerId, ...data },
      });
    }

    // Save snapshot
    await this.prisma.customerMetricHistory.create({
      data: {
        tenantId,
        customerId,
        metricsSnapshot: data as any,
        computedAt: now,
      },
    });

    return metrics;
  }
}
