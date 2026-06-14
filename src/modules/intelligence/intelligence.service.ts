import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CustomerMetricsService,
  FeatureComputationService,
  EngagementService,
  ChurnRiskService,
  PersonaAssignmentService,
  SegmentResolverService,
  CategoryAffinityService,
} from './services';

/**
 * Orchestrates the full intelligence pipeline and serves Customer 360 views.
 */
@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: CustomerMetricsService,
    private readonly featureService: FeatureComputationService,
    private readonly engagementService: EngagementService,
    private readonly churnService: ChurnRiskService,
    private readonly personaService: PersonaAssignmentService,
    private readonly segmentService: SegmentResolverService,
    private readonly categoryAffinityService: CategoryAffinityService,
  ) {}

  /**
   * Run the full intelligence pipeline for a tenant.
   * Order: Metrics → Features → Engagement → Churn → Personas → Segments
   */
  async computeAll(tenantId: string) {
    const startTime = Date.now();
    this.logger.log(
      `🧠 Starting intelligence computation for tenant ${tenantId}`,
    );

    // Step 1: Metrics (needs raw orders)
    const metricsCount = await this.metricsService.computeForTenant(tenantId);
    this.logger.log(`  ✅ Metrics: ${metricsCount} customers`);

    // Step 2: Features (needs orders + metrics)
    const featureCount = await this.featureService.computeForTenant(tenantId);
    this.logger.log(`  ✅ Features: ${featureCount} computed`);

    // Step 3: Engagement (needs comm logs + preferences)
    const engagementCount =
      await this.engagementService.computeForTenant(tenantId);
    this.logger.log(`  ✅ Engagement: ${engagementCount} customers`);

    // Step 4: Churn risk (needs metrics + engagement)
    const churnCount = await this.churnService.computeForTenant(tenantId);
    this.logger.log(`  ✅ Churn risk: ${churnCount} customers`);

    // Step 5: Personas (needs all above)
    const personaResult = await this.personaService.computeForTenant(tenantId);
    this.logger.log(`  ✅ Personas: ${personaResult.assigned} assignments`);

    // Step 5.5: Category Affinities
    const catAffinityCount =
      await this.categoryAffinityService.computeForTenant(tenantId);
    this.logger.log(`  ✅ Category Affinities: ${catAffinityCount} computed`);

    // Step 6: Segments (needs everything)
    const segmentResult = await this.segmentService.resolveForTenant(tenantId);
    this.logger.log(`  ✅ Segments: ${segmentResult.resolved} resolved`);

    const duration = Date.now() - startTime;
    this.logger.log(`🧠 Intelligence computation complete in ${duration}ms`);

    return {
      tenantId,
      duration: `${duration}ms`,
      metrics: metricsCount,
      features: featureCount,
      engagement: engagementCount,
      churn: churnCount,
      personas: personaResult,
      categoryAffinities: catAffinityCount,
      segments: segmentResult,
    };
  }

  /**
   * Customer 360 Intelligence view.
   */
  async getCustomer360(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: {
        addresses: true,
        channels: true,
        preferences: true,
        consents: true,
        devices: true,
        identities: true,
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    // Metrics
    const metrics = await this.prisma.customerMetric.findFirst({
      where: { tenantId, customerId },
    });

    // Features
    const features = await this.prisma.customerFeature.findMany({
      where: { tenantId, customerId },
      orderBy: { featureName: 'asc' },
    });

    // Personas
    const personas = await this.prisma.customerPersona.findMany({
      where: { tenantId, customerId },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: { confidence: 'desc' },
    });

    // Segments
    const segments = await this.prisma.segmentCustomer.findMany({
      where: { tenantId, customerId, removedAt: null },
      include: {
        segment: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            customerCount: true,
          },
        },
      },
    });

    // Top categories from orders
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { tenantId, customerId } },
      select: { category: true, totalPrice: true },
    });
    const categorySpend: Record<string, number> = {};
    for (const item of orderItems) {
      const cat = item.category || 'Uncategorized';
      categorySpend[cat] = (categorySpend[cat] || 0) + Number(item.totalPrice);
    }
    const topCategories = Object.entries(categorySpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, spend]) => ({ name, spend }));

    // Product affinities
    const affinities = await this.prisma.customerProductAffinity.findMany({
      where: { tenantId, customerId },
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { affinityScore: 'desc' },
      take: 5,
    });

    // Category affinities from intelligence engine
    const dbCategoryAffinities =
      await this.prisma.customerCategoryAffinity.findMany({
        where: { tenantId, customerId },
        orderBy: { affinityScore: 'desc' },
      });

    const featureMap: Record<string, any> = {};
    for (const f of features) {
      // Normalize to UPPERCASE to prevent duplicate keys from seed vs engine
      featureMap[f.featureName.toUpperCase()] = f.featureValue;
    }

    return {
      customer: {
        id: customer.id,
        externalId: customer.externalId,
        email: customer.email,
        phone: customer.phone,
        firstName: customer.firstName,
        lastName: customer.lastName,
        gender: customer.gender,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        status: customer.status,
        acquisitionSource: customer.acquisitionSource,
      },
      metrics: metrics
        ? {
            totalOrders: metrics.totalOrders,
            totalRevenue: Number(metrics.totalRevenue),
            avgOrderValue: Number(metrics.avgOrderValue),
            firstOrderAt: metrics.firstOrderAt,
            lastOrderAt: metrics.lastOrderAt,
            daysSinceLastOrder: metrics.daysSinceLastOrder,
            orderFrequencyDays: Number(metrics.orderFrequencyDays),
            lifetimeValue: Number(metrics.lifetimeValue),
            predictedNextOrderAt: metrics.predictedNextOrderAt,
          }
        : null,
      rfm: metrics
        ? {
            recency: metrics.rfmRecencyScore,
            frequency: metrics.rfmFrequencyScore,
            monetary: metrics.rfmMonetaryScore,
            combined: metrics.rfmCombinedScore,
          }
        : null,
      engagement: {
        overall: Number(metrics?.engagementScore ?? 0),
        email: featureMap['EMAIL_ENGAGEMENT_SCORE'] ?? null,
        sms: featureMap['SMS_ENGAGEMENT_SCORE'] ?? null,
        whatsapp: featureMap['WHATSAPP_ENGAGEMENT_SCORE'] ?? null,
      },
      churnRisk: Number(metrics?.churnRiskScore ?? 0),
      personas: personas.map((pa) => ({
        id: pa.persona.id,
        name: pa.persona.name,
        description: pa.persona.description,
        confidence: Number(pa.confidence),
        assignedAt: pa.assignedAt,
      })),
      segments: segments.map((sc) => ({
        id: sc.segment.id,
        name: sc.segment.name,
        description: sc.segment.description,
        type: sc.segment.type,
        memberCount: sc.segment.customerCount,
        addedAt: sc.addedAt,
      })),
      features: featureMap,
      topCategories,
      categoryAffinities:
        dbCategoryAffinities.length > 0
          ? dbCategoryAffinities.map((ca) => ({
              category: ca.category,
              spend: Number(ca.totalSpend),
              affinityScore: Number(ca.affinityScore),
              purchaseCount: ca.purchaseCount,
              isPreferred: ca.isPreferred,
            }))
          : topCategories.map((cat, idx) => ({
              category: cat.name,
              spend: cat.spend,
              affinityScore: Math.round((1 - idx * 0.15) * 100) / 100,
            })),
      preferredCategory:
        dbCategoryAffinities.find((ca) => ca.isPreferred)?.category ??
        topCategories[0]?.name ??
        null,
      categoryDiversity: Number(featureMap['CATEGORY_DIVERSITY'] ?? 0),
      productAffinities: affinities.map((a) => ({
        product: a.product,
        score: Number(a.affinityScore),
        purchaseCount: a.purchaseCount,
      })),
      preferences: (customer.preferences as any)?.[0] ?? null,
      channels: customer.channels,
      consents: customer.consents,
      // Decision readiness placeholders (Phase 4)
      decisioning: {
        recommended_channel: null, // Will be set by Decision Engine
        recommended_offer_type: null, // Will be set by Decision Engine
        recommended_next_action: null, // Will be set by Decision Engine
        decision_readiness_score: this.computeDecisionReadiness(
          metrics,
          featureMap,
          personas,
        ),
      },
      computedAt: metrics?.computedAt ?? null,
    };
  }

  /**
   * Explain WHY a customer has their personas, segments, and scores.
   */
  async explainCustomer(tenantId: string, customerId: string) {
    const metrics = await this.prisma.customerMetric.findFirst({
      where: { tenantId, customerId },
    });

    const features = await this.prisma.customerFeature.findMany({
      where: { tenantId, customerId },
    });

    const personas = await this.prisma.customerPersona.findMany({
      where: { tenantId, customerId },
      include: { persona: true },
    });

    const segments = await this.prisma.segmentCustomer.findMany({
      where: { tenantId, customerId, removedAt: null },
      include: { segment: true },
    });

    const featureMap: Record<string, number> = {};
    for (const f of features)
      featureMap[f.featureName] = Number(f.featureValue);

    // Generate explanations
    const explanations: any[] = [];

    // Persona explanations
    for (const pa of personas) {
      const reasons: string[] = [];

      switch (pa.persona.name) {
        case 'HIGH_VALUE_LOYALIST':
          reasons.push(
            `Total revenue ₹${Number(metrics?.totalRevenue)} exceeds ₹10,000 threshold`,
          );
          reasons.push(`${metrics?.totalOrders} orders (min 4 required)`);
          reasons.push(
            `Last purchase ${metrics?.daysSinceLastOrder} days ago (within 90 day window)`,
          );
          break;
        case 'DORMANT_HIGH_VALUE':
          reasons.push(
            `Total revenue ₹${Number(metrics?.totalRevenue)} exceeds ₹5,000`,
          );
          reasons.push(
            `Inactive for ${metrics?.daysSinceLastOrder} days (>120 day threshold)`,
          );
          break;
        case 'DISCOUNT_HUNTER':
          reasons.push(
            `Discount affinity: ${Math.round((featureMap['DISCOUNT_AFFINITY'] ?? 0) * 100)}% (threshold: 60%)`,
          );
          break;
        case 'PREMIUM_BUYER':
          reasons.push(
            `Premium buyer score: ${featureMap['PREMIUM_BUYER_SCORE']?.toFixed(2)} (threshold: 0.70)`,
          );
          reasons.push(
            `Average order value: ₹${Number(metrics?.avgOrderValue)}`,
          );
          break;
        case 'AT_RISK_CUSTOMER':
          reasons.push(
            `Churn risk score: ${Number(metrics?.churnRiskScore)?.toFixed(4)} (threshold: 0.60)`,
          );
          reasons.push(`Engagement score: ${Number(metrics?.engagementScore)}`);
          break;
        default:
          reasons.push(
            `Matched ${pa.persona.name} rule with confidence ${Number(pa.confidence).toFixed(2)}`,
          );
      }

      explanations.push({
        type: 'persona',
        name: pa.persona.name,
        confidence: Number(pa.confidence),
        reasons,
      });
    }

    // Segment explanations
    for (const sc of segments) {
      const rules = sc.segment.rules as any;
      explanations.push({
        type: 'segment',
        name: sc.segment.name,
        rules: rules?.conditions?.map((c: any) =>
          `${c.type}.${c.field || c.persona || ''} ${c.op || 'match'} ${c.value ?? ''}`.trim(),
        ) ?? ['Dynamic segment matched'],
      });
    }

    // Score explanations
    if (metrics) {
      explanations.push({
        type: 'score',
        name: 'RFM Score',
        value: metrics.rfmCombinedScore,
        breakdown: {
          recency: `${metrics.rfmRecencyScore}/5 (${metrics.daysSinceLastOrder} days since purchase)`,
          frequency: `${metrics.rfmFrequencyScore}/5 (${metrics.totalOrders} orders)`,
          monetary: `${metrics.rfmMonetaryScore}/5 (₹${Number(metrics.totalRevenue)} total spend)`,
          formula: '(recency × 0.4 + frequency × 0.35 + monetary × 0.25) × 20',
        },
      });

      explanations.push({
        type: 'score',
        name: 'Churn Risk',
        value: Number(metrics.churnRiskScore),
        breakdown: {
          recencyFactor: `${metrics.daysSinceLastOrder} days inactive (weight: 40%)`,
          frequencyFactor: `${metrics.totalOrders} orders (weight: 25%)`,
          engagementFactor: `${Number(metrics.engagementScore)} engagement (weight: 20%)`,
          spendFactor: `₹${Number(metrics.avgOrderValue)} AOV (weight: 15%)`,
        },
      });
    }

    return {
      customerId,
      explanationCount: explanations.length,
      explanations,
    };
  }

  /**
   * Compute how "decision-ready" a customer is based on data completeness.
   * Score 0-100: Higher = more intelligence available for decisioning.
   */
  private computeDecisionReadiness(
    metrics: any,
    featureMap: Record<string, any>,
    personas: any[],
  ): number {
    let score = 0;
    const weights = {
      hasMetrics: 20,
      hasFeatures: 20,
      hasPersonas: 15,
      hasRfm: 10,
      hasChurnScore: 10,
      hasEngagement: 10,
      hasLtv: 10,
      hasCategories: 5,
    };

    if (metrics) score += weights.hasMetrics;
    if (Object.keys(featureMap).length >= 5) score += weights.hasFeatures;
    if (personas.length > 0) score += weights.hasPersonas;
    if (metrics?.rfmCombinedScore != null) score += weights.hasRfm;
    if (metrics?.churnRiskScore != null) score += weights.hasChurnScore;
    if (metrics?.engagementScore != null) score += weights.hasEngagement;
    if (metrics?.lifetimeValue != null) score += weights.hasLtv;
    if (featureMap['CATEGORY_DIVERSITY'] != null)
      score += weights.hasCategories;

    return score;
  }
}
