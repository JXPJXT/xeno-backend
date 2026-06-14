import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Computes category-level affinities for each customer based on purchase history.
 * Produces: top categories, category diversity, preferred category, category scores.
 */
@Injectable()
export class CategoryAffinityService {
  private readonly logger = new Logger(CategoryAffinityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeForTenant(tenantId: string): Promise<number> {
    const now = new Date();

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    let totalComputed = 0;

    for (const customer of customers) {
      const count = await this.computeForCustomer(tenantId, customer.id, now);
      totalComputed += count;
    }

    this.logger.log(
      `Computed ${totalComputed} category affinities for ${customers.length} customers in tenant ${tenantId}`,
    );
    return totalComputed;
  }

  async computeForCustomer(
    tenantId: string,
    customerId: string,
    now = new Date(),
  ): Promise<number> {
    // Fetch all order items for delivered orders
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: { tenantId, customerId, status: 'DELIVERED' },
      },
      select: {
        category: true,
        totalPrice: true,
        quantity: true,
        order: { select: { orderedAt: true } },
      },
    });

    if (items.length === 0) return 0;

    // Aggregate by category
    const categoryMap: Record<
      string,
      { spend: number; count: number; items: number; lastDate: Date }
    > = {};

    for (const item of items) {
      const cat = item.category || 'Uncategorized';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          spend: 0,
          count: 0,
          items: 0,
          lastDate: new Date(0),
        };
      }
      categoryMap[cat].spend += Number(item.totalPrice);
      categoryMap[cat].count += 1;
      categoryMap[cat].items += item.quantity;
      const orderDate = item.order?.orderedAt
        ? new Date(item.order.orderedAt)
        : new Date(0);
      if (orderDate > categoryMap[cat].lastDate) {
        categoryMap[cat].lastDate = orderDate;
      }
    }

    // Total spend for normalization
    const totalSpend = Object.values(categoryMap).reduce(
      (s, c) => s + c.spend,
      0,
    );
    const totalCount = Object.values(categoryMap).reduce(
      (s, c) => s + c.count,
      0,
    );

    // Find top category
    const sorted = Object.entries(categoryMap).sort(
      (a, b) => b[1].spend - a[1].spend,
    );
    const topCategory = sorted[0]?.[0];

    // Upsert each category affinity
    let count = 0;
    for (const [category, data] of sorted) {
      const spendRatio = totalSpend > 0 ? data.spend / totalSpend : 0;
      const freqRatio = totalCount > 0 ? data.count / totalCount : 0;
      // Weighted: 60% spend + 40% frequency
      const affinityScore =
        Math.round((spendRatio * 0.6 + freqRatio * 0.4) * 10000) / 10000;
      const avgItemValue = data.items > 0 ? data.spend / data.items : 0;

      const existing = await this.prisma.customerCategoryAffinity.findFirst({
        where: { tenantId, customerId, category },
      });

      const payload = {
        affinityScore,
        totalSpend: data.spend,
        purchaseCount: data.count,
        avgItemValue,
        lastPurchasedAt: data.lastDate > new Date(0) ? data.lastDate : null,
        isPreferred: category === topCategory,
        computedAt: now,
      };

      if (existing) {
        await this.prisma.customerCategoryAffinity.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await this.prisma.customerCategoryAffinity.create({
          data: { tenantId, customerId, category, ...payload },
        });
      }
      count++;
    }

    return count;
  }
}
