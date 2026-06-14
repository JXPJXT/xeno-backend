import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * Evaluates segment rules against customer data and populates segment_customers.
 * Supports: AND, OR, nested groups, feature/metric/persona/product/preference rules.
 *
 * Rule format (stored in segments.rules JSON):
 * {
 *   "operator": "AND" | "OR",
 *   "conditions": [
 *     { "type": "metric", "field": "totalRevenue", "op": "gt", "value": 5000 },
 *     { "type": "feature", "field": "DISCOUNT_AFFINITY", "op": "gte", "value": 0.5 },
 *     { "type": "persona", "persona": "HIGH_VALUE_LOYALIST" },
 *     { "type": "group", "operator": "OR", "conditions": [...] }
 *   ]
 * }
 */

interface RuleCondition {
  type: 'metric' | 'feature' | 'persona' | 'preference' | 'group';
  field?: string;
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value?: any;
  persona?: string;
  operator?: 'AND' | 'OR';
  conditions?: RuleCondition[];
}

interface SegmentRule {
  operator: 'AND' | 'OR';
  conditions: RuleCondition[];
}

@Injectable()
export class SegmentResolverService {
  private readonly logger = new Logger(SegmentResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveForTenant(
    tenantId: string,
  ): Promise<{ resolved: number; segments: Record<string, number> }> {
    const segments = await this.prisma.segment.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null, type: 'DYNAMIC' },
    });

    const stats: Record<string, number> = {};
    let totalResolved = 0;

    for (const segment of segments) {
      const count = await this.resolveSegment(
        tenantId,
        segment.id,
        segment.rules as unknown as SegmentRule,
      );
      stats[segment.name] = count;
      totalResolved++;
    }

    this.logger.log(
      `Resolved ${totalResolved} segments for tenant ${tenantId}`,
    );
    return { resolved: totalResolved, segments: stats };
  }

  async resolveSegment(
    tenantId: string,
    segmentId: string,
    rules: SegmentRule | null,
  ): Promise<number> {
    if (!rules || !rules.conditions || rules.conditions.length === 0) return 0;

    const now = new Date();
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    // Remove old memberships
    await this.prisma.segmentCustomer.deleteMany({
      where: { tenantId, segmentId },
    });

    let memberCount = 0;

    for (const customer of customers) {
      const ctx = await this.loadCustomerContext(tenantId, customer.id);
      const matches = this.evaluateGroup(rules, ctx);

      if (matches) {
        await this.prisma.segmentCustomer.create({
          data: { tenantId, segmentId, customerId: customer.id, addedAt: now },
        });
        memberCount++;
      }
    }

    // Update segment count
    await this.prisma.segment.update({
      where: { id: segmentId },
      data: { customerCount: memberCount, lastComputedAt: now },
    });

    return memberCount;
  }

  private evaluateGroup(group: SegmentRule, ctx: CustomerContext): boolean {
    const results = group.conditions.map((c) => this.evaluateCondition(c, ctx));
    return group.operator === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  private evaluateCondition(
    condition: RuleCondition,
    ctx: CustomerContext,
  ): boolean {
    switch (condition.type) {
      case 'group':
        return this.evaluateGroup(
          {
            operator: condition.operator || 'AND',
            conditions: condition.conditions || [],
          },
          ctx,
        );

      case 'metric':
        return this.compareValue(
          ctx.metrics[condition.field!],
          condition.op!,
          condition.value,
        );

      case 'feature':
        return this.compareValue(
          ctx.features[condition.field!],
          condition.op!,
          condition.value,
        );

      case 'persona':
        return ctx.personas.has(condition.persona!);

      case 'preference':
        return this.compareValue(
          ctx.preferences[condition.field!],
          condition.op!,
          condition.value,
        );

      default:
        return false;
    }
  }

  private compareValue(actual: any, op: string, expected: any): boolean {
    if (actual === undefined || actual === null) return false;
    const a = Number(actual);
    const b = Number(expected);

    switch (op) {
      case 'eq':
        return actual === expected || a === b;
      case 'neq':
        return actual !== expected && a !== b;
      case 'gt':
        return a > b;
      case 'gte':
        return a >= b;
      case 'lt':
        return a < b;
      case 'lte':
        return a <= b;
      case 'contains':
        return String(actual)
          .toLowerCase()
          .includes(String(expected).toLowerCase());
      default:
        return false;
    }
  }

  private async loadCustomerContext(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerContext> {
    const [metric, features, personaAssignments, preferences] =
      await Promise.all([
        this.prisma.customerMetric.findFirst({
          where: { tenantId, customerId },
        }),
        this.prisma.customerFeature.findMany({
          where: { tenantId, customerId },
        }),
        this.prisma.customerPersona.findMany({
          where: { tenantId, customerId },
          include: { persona: { select: { name: true } } },
        }),
        this.prisma.customerPreference.findFirst({
          where: { tenantId, customerId },
        }),
      ]);

    const metricsMap: Record<string, any> = {};
    if (metric) {
      metricsMap['totalOrders'] = metric.totalOrders;
      metricsMap['totalRevenue'] = Number(metric.totalRevenue);
      metricsMap['avgOrderValue'] = Number(metric.avgOrderValue);
      metricsMap['daysSinceLastOrder'] = metric.daysSinceLastOrder;
      metricsMap['rfmCombinedScore'] = metric.rfmCombinedScore;
      metricsMap['churnRiskScore'] = Number(metric.churnRiskScore);
      metricsMap['engagementScore'] = Number(metric.engagementScore);
      metricsMap['lifetimeValue'] = Number(metric.lifetimeValue);
    }

    const featureMap: Record<string, any> = {};
    for (const f of features)
      featureMap[f.featureName] = Number(f.featureValue);

    const personaSet = new Set<string>(
      personaAssignments.map((pa: any) => pa.persona.name as string),
    );

    const prefMap: Record<string, any> = {};
    if (preferences) {
      prefMap['emailEnabled'] = preferences.emailEnabled;
      prefMap['smsEnabled'] = preferences.smsEnabled;
      prefMap['whatsappEnabled'] = preferences.whatsappEnabled;
      prefMap['pushEnabled'] = preferences.pushEnabled;
      prefMap['preferredChannel'] = preferences.preferredChannel;
    }

    return {
      metrics: metricsMap,
      features: featureMap,
      personas: personaSet,
      preferences: prefMap,
    };
  }
}

interface CustomerContext {
  metrics: Record<string, any>;
  features: Record<string, any>;
  personas: Set<string>;
  preferences: Record<string, any>;
}
