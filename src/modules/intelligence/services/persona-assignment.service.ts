import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

interface PersonaRule {
  name: string;
  description: string;
  evaluate: (ctx: PersonaContext) => {
    match: boolean;
    confidence: number;
    reason: string;
  };
}

interface PersonaContext {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  daysSinceLastOrder: number;
  rfmCombinedScore: number;
  churnRiskScore: number;
  engagementScore: number;
  discountAffinity: number;
  premiumBuyerScore: number;
  categoryDiversity: number;
  weekendBuyerScore: number;
  firstOrderAt: Date | null;
}

/**
 * Automatically assigns personas to customers based on configurable rules.
 * Each customer can have multiple personas with confidence scores.
 */
@Injectable()
export class PersonaAssignmentService {
  private readonly logger = new Logger(PersonaAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Configurable persona rules */
  private readonly rules: PersonaRule[] = [
    {
      name: 'HIGH_VALUE_LOYALIST',
      description: 'Consistent high spender with strong engagement',
      evaluate: (ctx) => {
        const match =
          ctx.totalRevenue >= 10000 &&
          ctx.totalOrders >= 4 &&
          ctx.daysSinceLastOrder < 90;
        const confidence = match
          ? Math.min(
              1,
              (ctx.totalRevenue / 20000) * 0.5 + (ctx.totalOrders / 8) * 0.5,
            )
          : 0;
        return {
          match,
          confidence,
          reason: `Revenue ₹${ctx.totalRevenue}, ${ctx.totalOrders} orders, ${ctx.daysSinceLastOrder}d since last`,
        };
      },
    },
    {
      name: 'DORMANT_HIGH_VALUE',
      description: 'Previously high spender who has gone silent',
      evaluate: (ctx) => {
        const match = ctx.totalRevenue >= 5000 && ctx.daysSinceLastOrder > 120;
        const confidence = match
          ? Math.min(1, ctx.daysSinceLastOrder / 365)
          : 0;
        return {
          match,
          confidence,
          reason: `Revenue ₹${ctx.totalRevenue} but ${ctx.daysSinceLastOrder}d inactive`,
        };
      },
    },
    {
      name: 'DISCOUNT_HUNTER',
      description: 'Primarily buys with discounts',
      evaluate: (ctx) => {
        const match = ctx.discountAffinity >= 0.6 && ctx.totalOrders >= 2;
        const confidence = match ? ctx.discountAffinity : 0;
        return {
          match,
          confidence,
          reason: `${Math.round(ctx.discountAffinity * 100)}% discount usage`,
        };
      },
    },
    {
      name: 'PREMIUM_BUYER',
      description: 'Consistently buys high-ticket items',
      evaluate: (ctx) => {
        const match = ctx.premiumBuyerScore >= 0.7;
        const confidence = match ? ctx.premiumBuyerScore : 0;
        return {
          match,
          confidence,
          reason: `Premium score ${ctx.premiumBuyerScore}, AOV ₹${ctx.avgOrderValue}`,
        };
      },
    },
    {
      name: 'FREQUENT_SHOPPER',
      description: 'High purchase frequency',
      evaluate: (ctx) => {
        const match = ctx.totalOrders >= 5 && ctx.daysSinceLastOrder < 60;
        const confidence = match ? Math.min(1, ctx.totalOrders / 10) : 0;
        return {
          match,
          confidence,
          reason: `${ctx.totalOrders} orders, active ${ctx.daysSinceLastOrder}d ago`,
        };
      },
    },
    {
      name: 'AT_RISK_CUSTOMER',
      description: 'Showing signs of churning',
      evaluate: (ctx) => {
        const match = ctx.churnRiskScore >= 0.6;
        const confidence = match ? ctx.churnRiskScore : 0;
        return {
          match,
          confidence,
          reason: `Churn risk ${ctx.churnRiskScore}, engagement ${ctx.engagementScore}`,
        };
      },
    },
    {
      name: 'NEW_CUSTOMER',
      description: 'Recently acquired customer',
      evaluate: (ctx) => {
        const isNew =
          ctx.firstOrderAt &&
          new Date().getTime() - new Date(ctx.firstOrderAt).getTime() <
            30 * 86400000;
        const match = Boolean(isNew) && ctx.totalOrders <= 2;
        return {
          match,
          confidence: match ? 0.9 : 0,
          reason: `First order ${ctx.firstOrderAt ? new Date(ctx.firstOrderAt).toISOString().slice(0, 10) : 'N/A'}, ${ctx.totalOrders} orders`,
        };
      },
    },
    {
      name: 'WEEKEND_BUYER',
      description: 'Predominantly buys on weekends',
      evaluate: (ctx) => {
        const match = ctx.weekendBuyerScore >= 0.6;
        const confidence = match ? ctx.weekendBuyerScore : 0;
        return {
          match,
          confidence,
          reason: `${Math.round(ctx.weekendBuyerScore * 100)}% weekend purchases`,
        };
      },
    },
    {
      name: 'MULTI_CATEGORY_BUYER',
      description: 'Shops across multiple categories',
      evaluate: (ctx) => {
        const match = ctx.categoryDiversity >= 0.6;
        const confidence = match ? ctx.categoryDiversity : 0;
        return {
          match,
          confidence,
          reason: `Category diversity ${ctx.categoryDiversity}`,
        };
      },
    },
  ];

  async computeForTenant(
    tenantId: string,
  ): Promise<{ assigned: number; personas: Record<string, number> }> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    // Ensure all persona records exist
    await this.ensurePersonas(tenantId);

    const personaMap = await this.getPersonaMap(tenantId);
    const stats: Record<string, number> = {};
    let totalAssigned = 0;

    for (const customer of customers) {
      const ctx = await this.buildContext(tenantId, customer.id);
      if (!ctx) continue;

      // Clear old assignments
      await this.prisma.customerPersona.deleteMany({
        where: { tenantId, customerId: customer.id, assignedBy: 'SYSTEM' },
      });

      for (const rule of this.rules) {
        const result = rule.evaluate(ctx);
        if (result.match && result.confidence > 0.3) {
          const personaId = personaMap[rule.name];
          if (!personaId) continue;

          await this.prisma.customerPersona.create({
            data: {
              tenantId,
              customerId: customer.id,
              personaId,
              confidence: result.confidence,
              assignedBy: 'SYSTEM',
            },
          });

          stats[rule.name] = (stats[rule.name] || 0) + 1;
          totalAssigned++;
        }
      }
    }

    this.logger.log(
      `Assigned ${totalAssigned} personas across ${customers.length} customers`,
    );
    return { assigned: totalAssigned, personas: stats };
  }

  private async ensurePersonas(tenantId: string) {
    for (const rule of this.rules) {
      const exists = await this.prisma.persona.findFirst({
        where: { tenantId, name: rule.name },
      });
      if (!exists) {
        await this.prisma.persona.create({
          data: {
            tenantId,
            name: rule.name,
            description: rule.description,
            isSystem: true,
            status: 'ACTIVE',
            priority: this.rules.indexOf(rule),
            criteria: { type: 'rule_based', evaluator: rule.name },
          },
        });
      }
    }
  }

  private async getPersonaMap(
    tenantId: string,
  ): Promise<Record<string, string>> {
    const personas = await this.prisma.persona.findMany({
      where: { tenantId, status: 'ACTIVE', isSystem: true },
      select: { id: true, name: true },
    });
    return Object.fromEntries(personas.map((p: any) => [p.name, p.id]));
  }

  private async buildContext(
    tenantId: string,
    customerId: string,
  ): Promise<PersonaContext | null> {
    const metric = await this.prisma.customerMetric.findFirst({
      where: { tenantId, customerId },
    });
    if (!metric) return null;

    const features = await this.prisma.customerFeature.findMany({
      where: { tenantId, customerId },
    });

    const featureMap: Record<string, number> = {};
    for (const f of features) {
      featureMap[f.featureName] = Number(f.featureValue);
    }

    return {
      totalOrders: metric.totalOrders,
      totalRevenue: Number(metric.totalRevenue),
      avgOrderValue: Number(metric.avgOrderValue),
      daysSinceLastOrder: metric.daysSinceLastOrder ?? 999,
      rfmCombinedScore: metric.rfmCombinedScore ?? 0,
      churnRiskScore: Number(metric.churnRiskScore ?? 0.5),
      engagementScore: Number(metric.engagementScore ?? 50),
      discountAffinity: featureMap['DISCOUNT_AFFINITY'] ?? 0,
      premiumBuyerScore: featureMap['PREMIUM_BUYER_SCORE'] ?? 0,
      categoryDiversity: featureMap['CATEGORY_DIVERSITY'] ?? 0,
      weekendBuyerScore: featureMap['WEEKEND_BUYER_SCORE'] ?? 0,
      firstOrderAt: metric.firstOrderAt,
    };
  }
}
