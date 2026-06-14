import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { GoalType, DecisionStatus } from '@prisma/client';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AudienceRecommendation {
  segmentId: string;
  segmentName: string;
  estimatedSize: number;
  topPersonas: string[];
  avgLifetimeValue: number;
}

interface OfferRecommendation {
  type: string;
  name: string;
  value: number;
  reasoning: string;
}

interface ChannelRecommendation {
  channel: string;
  confidence: number;
  reasoning: string;
}

interface MessageRecommendation {
  subject: string | null;
  body: string;
}

export interface DecisionResult {
  decisionId: string;
  goal: string;
  goalType: string;
  audience: AudienceRecommendation;
  offer: OfferRecommendation;
  channel: string;
  channelReasoning: string;
  messageTemplate: MessageRecommendation;
  reasoning: string[];
  confidence: number;
  status: string;
}

// ─────────────────────────────────────────────
// Goal keyword map
// ─────────────────────────────────────────────

const GOAL_KEYWORDS: Array<{ keywords: string[]; goalType: GoalType }> = [
  {
    keywords: [
      'reactivat',
      'dormant',
      'inactive',
      'comeback',
      'sleeping',
      'win back',
      'winback',
    ],
    goalType: GoalType.REACTIVATION,
  },
  {
    keywords: ['churn', 'at risk', 'at-risk', 'losing', 'prevent'],
    goalType: GoalType.WIN_BACK,
  },
  {
    keywords: ['reward', 'loyalty program', 'points', 'reward customers'],
    goalType: GoalType.LOYALTY,
  },
  {
    keywords: ['retain', 'loyal', 'repeat', 'keep'],
    goalType: GoalType.RETENTION,
  },
  {
    keywords: ['upsell', 'upgrade', 'premium', 'higher', 'order value'],
    goalType: GoalType.UPSELL,
  },
  {
    keywords: [
      'cross sell',
      'cross-sell',
      'complementary',
      'also buy',
      'related',
    ],
    goalType: GoalType.CROSS_SELL,
  },
  {
    keywords: ['engag', 'open', 'click', 'active', 'interact'],
    goalType: GoalType.ENGAGEMENT,
  },
  {
    keywords: ['new', 'acqui', 'grow', 'attract', 'first'],
    goalType: GoalType.ACQUISITION,
  },
];

// ─────────────────────────────────────────────
// Segment matching patterns per goal type
// ─────────────────────────────────────────────

const SEGMENT_PATTERNS: Record<string, string[]> = {
  REACTIVATION: ['dormant', 'inactive', 'sleeping'],
  WIN_BACK: ['churn', 'risk', 'at-risk', 'dormant'],
  RETENTION: ['active', 'high-value', 'loyal'],
  UPSELL: ['active', 'high-value', 'premium'],
  CROSS_SELL: ['active', 'multi', 'frequent'],
  ENGAGEMENT: ['first-time', 'new', 'all'],
  ACQUISITION: ['first-time', 'new'],
  LOYALTY: ['active', 'loyal', 'high-value'],
  CUSTOM: [],
};

// ─────────────────────────────────────────────
// Goal-type channel affinity bonuses (Fix C1)
// ─────────────────────────────────────────────

const GOAL_CHANNEL_BONUS: Record<string, Record<string, number>> = {
  REACTIVATION: { EMAIL: 0.15 },
  WIN_BACK: { EMAIL: 0.15 },
  RETENTION: { EMAIL: 0.1 },
  LOYALTY: { EMAIL: 0.1 },
  UPSELL: { EMAIL: 0.1 },
  CROSS_SELL: { WHATSAPP: 0.1 },
  ENGAGEMENT: { WHATSAPP: 0.1 },
  ACQUISITION: { EMAIL: 0.1 },
  CUSTOM: {},
};

// ─────────────────────────────────────────────
// Persona → Offer type matrix
// ─────────────────────────────────────────────

const PERSONA_OFFER_MAP: Record<
  string,
  { type: string; name: string; value: number }
> = {
  DISCOUNT_HUNTER: {
    type: 'PERCENTAGE_DISCOUNT',
    name: '20% Exclusive Discount',
    value: 20,
  },
  DORMANT_HIGH_VALUE: {
    type: 'FLAT_DISCOUNT',
    name: '₹500 Comeback Offer',
    value: 500,
  },
  HIGH_VALUE_LOYALIST: {
    type: 'LOYALTY_POINTS',
    name: 'Double Loyalty Points',
    value: 2,
  },
  AT_RISK_CUSTOMER: {
    type: 'PERCENTAGE_DISCOUNT',
    name: '15% Retention Discount',
    value: 15,
  },
  PREMIUM_BUYER: {
    type: 'FREE_SHIPPING',
    name: 'Free Premium Shipping',
    value: 0,
  },
  FREQUENT_SHOPPER: {
    type: 'CASHBACK',
    name: '10% Cashback Reward',
    value: 10,
  },
  NEW_CUSTOMER: {
    type: 'PERCENTAGE_DISCOUNT',
    name: '10% Welcome Discount',
    value: 10,
  },
  WEEKEND_BUYER: {
    type: 'PERCENTAGE_DISCOUNT',
    name: 'Weekend Flash Sale 15%',
    value: 15,
  },
  MULTI_CATEGORY_BUYER: {
    type: 'BUNDLE',
    name: 'Category Bundle Deal',
    value: 25,
  },
};

// Default fallback offer per goal type
const GOAL_OFFER_DEFAULTS: Record<
  string,
  { type: string; name: string; value: number }
> = {
  REACTIVATION: {
    type: 'PERCENTAGE_DISCOUNT',
    name: '15% Comeback Discount',
    value: 15,
  },
  WIN_BACK: { type: 'FLAT_DISCOUNT', name: '₹300 Win-Back Offer', value: 300 },
  RETENTION: { type: 'LOYALTY_POINTS', name: 'Loyalty Reward Bonus', value: 2 },
  UPSELL: { type: 'BUNDLE', name: 'Premium Bundle Offer', value: 20 },
  CROSS_SELL: { type: 'BUNDLE', name: 'Category Bundle Offer', value: 25 },
  ENGAGEMENT: {
    type: 'FREE_SHIPPING',
    name: 'Free Shipping This Week',
    value: 0,
  },
  ACQUISITION: {
    type: 'PERCENTAGE_DISCOUNT',
    name: '10% First Purchase Discount',
    value: 10,
  },
  LOYALTY: { type: 'CASHBACK', name: '15% Loyalty Cashback', value: 15 },
  CUSTOM: { type: 'PERCENTAGE_DISCOUNT', name: '10% Special Offer', value: 10 },
};

// ─────────────────────────────────────────────
// Message template library: GoalType × Channel
// ─────────────────────────────────────────────

const MESSAGE_TEMPLATES: Record<
  string,
  Record<string, { subject: string; body: string }>
> = {
  REACTIVATION: {
    EMAIL: {
      subject: 'We miss you, {{firstName}}! Come back for a special offer',
      body: "Hi {{firstName}}, it's been a while since your last visit. As a valued {{primaryPersona}}, we'd love to welcome you back with an exclusive offer on {{topCategory}}. Your {{totalOrders}} orders mean the world to us!",
    },
    SMS: {
      subject: '',
      body: "Hi {{firstName}}! We miss you at StyleHub. Here's a special comeback offer on {{topCategory}} just for you. Shop now!",
    },
    WHATSAPP: {
      subject: '',
      body: "Hey {{firstName}}! 👋 It's been a while. We have something special for you in {{topCategory}}. Check it out!",
    },
  },
  WIN_BACK: {
    EMAIL: {
      subject: "{{firstName}}, we don't want to lose you!",
      body: "Hi {{firstName}}, we noticed you haven't visited recently. As a {{primaryPersona}}, you're one of our most valued customers. Here's a special offer to bring you back — enjoy savings on {{topCategory}} and more.",
    },
    SMS: {
      subject: '',
      body: "{{firstName}}, don't miss out! Special offer waiting for you on {{topCategory}}. Limited time only!",
    },
    WHATSAPP: {
      subject: '',
      body: "Hi {{firstName}}! 🎁 We have an exclusive deal on {{topCategory}} — made just for you. Don't miss it!",
    },
  },
  RETENTION: {
    EMAIL: {
      subject: 'Thank you for being one of our best customers, {{firstName}}!',
      body: "Hi {{firstName}}, as a {{primaryPersona}}, you're part of our most valued community. We've prepared something special for your loyalty — enjoy exclusive rewards on {{topCategory}} and your favorite categories.",
    },
    SMS: {
      subject: '',
      body: "Thanks {{firstName}}! You're one of our top customers. Enjoy exclusive {{topCategory}} rewards today!",
    },
    WHATSAPP: {
      subject: '',
      body: "Hi {{firstName}}! ⭐ Your loyalty means everything to us. Here's a special reward on {{topCategory}}!",
    },
  },
  UPSELL: {
    EMAIL: {
      subject: '{{firstName}}, upgrade your experience with premium picks',
      body: "Hi {{firstName}}, based on your love for {{topCategory}}, we think you'd enjoy our premium selection. As a {{primaryPersona}}, you deserve the best — check out our curated picks.",
    },
    SMS: {
      subject: '',
      body: '{{firstName}}, discover premium {{topCategory}} picks curated just for you. Upgrade your experience today!',
    },
    WHATSAPP: {
      subject: '',
      body: 'Hey {{firstName}}! 💎 Premium {{topCategory}} picks waiting for you. Elevate your style!',
    },
  },
  CROSS_SELL: {
    EMAIL: {
      subject: '{{firstName}}, complete your collection with these picks',
      body: "Hi {{firstName}}, since you love {{topCategory}}, we think you'd also enjoy complementary products from our collection. Mix and match for the perfect combination!",
    },
    SMS: {
      subject: '',
      body: '{{firstName}}, pair your {{topCategory}} favorites with these complementary picks. Shop now!',
    },
    WHATSAPP: {
      subject: '',
      body: 'Hi {{firstName}}! 🛍️ Complete your {{topCategory}} collection with these handpicked additions!',
    },
  },
  ENGAGEMENT: {
    EMAIL: {
      subject: "{{firstName}}, check out what's new in {{topCategory}}!",
      body: "Hi {{firstName}}, we have exciting new arrivals in {{topCategory}} that we think you'll love. Come explore and discover what's trending!",
    },
    SMS: {
      subject: '',
      body: "{{firstName}}, new arrivals in {{topCategory}}! Check out what's trending. Shop now!",
    },
    WHATSAPP: {
      subject: '',
      body: "Hey {{firstName}}! 🆕 New in {{topCategory}} — come see what's fresh!",
    },
  },
  ACQUISITION: {
    EMAIL: {
      subject: "Welcome {{firstName}}! Here's a special first-purchase offer",
      body: 'Hi {{firstName}}, welcome to StyleHub! As a new member, enjoy an exclusive discount on your first purchase. Start exploring {{topCategory}} and more!',
    },
    SMS: {
      subject: '',
      body: 'Welcome {{firstName}}! Enjoy a special discount on your first purchase. Start shopping now!',
    },
    WHATSAPP: {
      subject: '',
      body: "Welcome {{firstName}}! 🎉 Here's your exclusive first-purchase offer. Start shopping!",
    },
  },
  LOYALTY: {
    EMAIL: {
      subject: '{{firstName}}, your loyalty deserves a reward!',
      body: 'Hi {{firstName}}, as a {{primaryPersona}} with {{totalOrders}} orders, your loyalty means everything to us. Enjoy this exclusive reward — thank you for being part of our community!',
    },
    SMS: {
      subject: '',
      body: "{{firstName}}, thanks for {{totalOrders}} orders! Here's an exclusive loyalty reward just for you.",
    },
    WHATSAPP: {
      subject: '',
      body: "Hi {{firstName}}! 🏆 {{totalOrders}} orders — you're amazing! Here's your loyalty reward.",
    },
  },
  CUSTOM: {
    EMAIL: {
      subject: '{{firstName}}, we have something special for you',
      body: "Hi {{firstName}}, as a {{primaryPersona}}, we've prepared a special offer on {{topCategory}} just for you. Don't miss out!",
    },
    SMS: {
      subject: '',
      body: '{{firstName}}, special offer on {{topCategory}} waiting for you! Limited time.',
    },
    WHATSAPP: {
      subject: '',
      body: 'Hi {{firstName}}! 🎁 Special offer on {{topCategory}} — just for you!',
    },
  },
};

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

@Injectable()
export class DecisioningService {
  private readonly logger = new Logger(DecisioningService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main entry point: Goal → Audience → Offer → Channel → Message → Reasoning
   */
  async decide(tenantId: string, goalText: string): Promise<DecisionResult> {
    const reasoning: string[] = [];

    // Step 1: Classify goal
    const goalType = this.classifyGoal(goalText);
    reasoning.push(
      `Classified goal as ${goalType} based on keyword analysis of "${goalText}"`,
    );

    // Step 2: Select audience
    const audience = await this.selectAudience(tenantId, goalType, reasoning);

    // Step 3: Select offer
    const offer = await this.selectOffer(
      tenantId,
      audience,
      goalType,
      reasoning,
    );

    // Step 4: Select channel
    const channelRec = await this.selectChannel(
      tenantId,
      audience.segmentId,
      goalType,
      reasoning,
    );

    // Step 5: Generate message
    const message = this.generateMessage(
      goalType,
      channelRec.channel,
      audience.topPersonas[0],
      reasoning,
    );

    // Step 6: Compute confidence
    const confidence = this.computeConfidence(audience, channelRec);

    // Step 7: Persist decision + rules + explanations
    const decisionId = await this.persistDecision(
      tenantId,
      goalText,
      goalType,
      audience,
      offer,
      channelRec,
      message,
      reasoning,
      confidence,
    );

    this.logger.log(
      `Decision ${decisionId} created: ${goalType} → ${audience.segmentName} → ${channelRec.channel}`,
    );

    return {
      decisionId,
      goal: goalText,
      goalType,
      audience,
      offer,
      channel: channelRec.channel,
      channelReasoning: channelRec.reasoning,
      messageTemplate: message,
      reasoning,
      confidence,
      status: 'COMPLETED',
    };
  }

  // ──────────────────────────────────────
  // Step 1: Goal Classification
  // ──────────────────────────────────────

  private classifyGoal(goalText: string): GoalType {
    const lower = goalText.toLowerCase();
    for (const entry of GOAL_KEYWORDS) {
      if (entry.keywords.some((kw) => lower.includes(kw))) {
        return entry.goalType;
      }
    }
    return GoalType.CUSTOM;
  }

  // ──────────────────────────────────────
  // Step 2: Audience Selection
  // ──────────────────────────────────────

  private async selectAudience(
    tenantId: string,
    goalType: GoalType,
    reasoning: string[],
  ): Promise<AudienceRecommendation> {
    // Get all active segments
    const segments = await this.prisma.segment.findMany({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, name: true, customerCount: true },
      orderBy: { customerCount: 'desc' },
    });

    if (segments.length === 0) {
      throw new Error('No active segments available for audience selection');
    }

    // Match segment by goal type keywords
    const patterns = SEGMENT_PATTERNS[goalType] || [];
    let selectedSegment = segments[0]; // Fallback: largest segment

    for (const pattern of patterns) {
      const match = segments.find((s) =>
        s.name.toLowerCase().includes(pattern),
      );
      if (match && match.customerCount > 0) {
        selectedSegment = match;
        break;
      }
    }

    reasoning.push(
      `Selected segment "${selectedSegment.name}" with ${selectedSegment.customerCount} customers`,
    );

    // Get persona distribution for this segment's customers
    const segmentCustomerIds = await this.prisma.segmentCustomer.findMany({
      where: { tenantId, segmentId: selectedSegment.id },
      select: { customerId: true },
    });
    const customerIds = segmentCustomerIds.map((sc) => sc.customerId);

    let topPersonas: string[] = [];
    let avgLtv = 0;

    if (customerIds.length > 0) {
      // Persona distribution
      const personaAssignments = await this.prisma.customerPersona.findMany({
        where: { tenantId, customerId: { in: customerIds } },
        include: { persona: { select: { name: true } } },
      });

      const personaCounts: Record<string, number> = {};
      for (const pa of personaAssignments) {
        const name = pa.persona.name;
        personaCounts[name] = (personaCounts[name] || 0) + 1;
      }

      topPersonas = Object.entries(personaCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      if (topPersonas.length > 0) {
        const totalAssignments = personaAssignments.length;
        const topCount = personaCounts[topPersonas[0]] || 0;
        const pct = Math.round((topCount / totalAssignments) * 100);
        reasoning.push(
          `Audience persona distribution: ${topPersonas[0]} (${pct}%), ${topPersonas.slice(1).join(', ') || 'others'}`,
        );
      }

      // Average LTV
      const metrics = await this.prisma.customerMetric.findMany({
        where: { tenantId, customerId: { in: customerIds } },
        select: { lifetimeValue: true },
      });
      if (metrics.length > 0) {
        const totalLtv = metrics.reduce(
          (sum, m) => sum + Number(m.lifetimeValue || 0),
          0,
        );
        avgLtv = Math.round((totalLtv / metrics.length) * 100) / 100;
      }
    }

    return {
      segmentId: selectedSegment.id,
      segmentName: selectedSegment.name,
      estimatedSize: selectedSegment.customerCount,
      topPersonas,
      avgLifetimeValue: avgLtv,
    };
  }

  // ──────────────────────────────────────
  // Step 3: Offer Selection
  // ──────────────────────────────────────

  private async selectOffer(
    tenantId: string,
    audience: AudienceRecommendation,
    goalType: GoalType,
    reasoning: string[],
  ): Promise<OfferRecommendation> {
    // Check for active offers in DB
    const activeOffers = await this.prisma.offer.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true, name: true, offerType: true, value: true },
    });

    if (activeOffers.length > 0) {
      // Match offer by goal type
      const goalDefault = GOAL_OFFER_DEFAULTS[goalType];
      const matchedOffer =
        activeOffers.find((o) => o.offerType === goalDefault?.type) ||
        activeOffers[0];

      reasoning.push(
        `Selected existing offer "${matchedOffer.name}" (${matchedOffer.offerType}) from active offers`,
      );

      return {
        type: matchedOffer.offerType,
        name: matchedOffer.name,
        value: Number(matchedOffer.value),
        reasoning: `Matched active offer to ${goalType} goal type`,
      };
    }

    // No active offers — use goal-type default first, persona fallback for CUSTOM
    const goalDefault =
      GOAL_OFFER_DEFAULTS[goalType] || GOAL_OFFER_DEFAULTS.CUSTOM;
    const topPersona = audience.topPersonas[0] || '';
    const personaOffer = PERSONA_OFFER_MAP[topPersona];

    // Goal default takes priority (Fix O1), persona only for CUSTOM
    const selected =
      goalType === GoalType.CUSTOM && personaOffer ? personaOffer : goalDefault;

    const source =
      goalType === GoalType.CUSTOM && personaOffer
        ? `${topPersona} persona`
        : `${goalType} goal strategy`;

    reasoning.push(
      `No active offers in database. Generated recommendation: "${selected.name}" (${selected.type}) based on ${source}`,
    );

    return {
      type: selected.type,
      name: selected.name,
      value: selected.value,
      reasoning:
        goalType === GoalType.CUSTOM && personaOffer
          ? `${topPersona} persona responds best to ${selected.type}`
          : `${goalType} goal strategy recommends ${selected.type}`,
    };
  }

  // ──────────────────────────────────────
  // Step 4: Channel Selection
  // ──────────────────────────────────────

  private async selectChannel(
    tenantId: string,
    segmentId: string,
    goalType: GoalType,
    reasoning: string[],
  ): Promise<ChannelRecommendation> {
    // Get customer IDs in segment
    const segmentCustomers = await this.prisma.segmentCustomer.findMany({
      where: { tenantId, segmentId },
      select: { customerId: true },
    });
    const customerIds = segmentCustomers.map((sc) => sc.customerId);

    if (customerIds.length === 0) {
      reasoning.push(
        'No customers in segment for channel analysis. Defaulting to EMAIL.',
      );
      return {
        channel: 'EMAIL',
        confidence: 0.5,
        reasoning: 'Default channel — no audience data',
      };
    }

    // Aggregate preferred channels
    const preferences = await this.prisma.customerPreference.findMany({
      where: { tenantId, customerId: { in: customerIds } },
      select: { preferredChannel: true },
    });

    const channelCounts: Record<string, number> = {
      EMAIL: 0,
      SMS: 0,
      WHATSAPP: 0,
      PUSH: 0,
    };
    for (const pref of preferences) {
      const ch = pref.preferredChannel || 'EMAIL';
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    }

    // Engagement scores (features)
    const engagementFeatures = await this.prisma.customerFeature.findMany({
      where: {
        tenantId,
        customerId: { in: customerIds },
        featureName: {
          in: [
            'EMAIL_ENGAGEMENT',
            'email_open_rate',
            'WHATSAPP_ENGAGEMENT',
            'whatsapp_affinity',
          ],
        },
      },
      select: { featureName: true, featureValue: true },
    });

    const engScores: Record<string, number> = { EMAIL: 0, WHATSAPP: 0 };
    let emailCount = 0;
    let waCount = 0;
    for (const f of engagementFeatures) {
      const name = f.featureName.toUpperCase();
      const val = Number(f.featureValue);
      if (name.includes('EMAIL')) {
        engScores.EMAIL += val;
        emailCount++;
      }
      if (name.includes('WHATSAPP')) {
        engScores.WHATSAPP += val;
        waCount++;
      }
    }
    if (emailCount > 0) engScores.EMAIL /= emailCount;
    if (waCount > 0) engScores.WHATSAPP /= waCount;

    // Score each channel: preference weight (60%) + engagement weight (40%) + goal bonus
    const totalPrefs = preferences.length || 1;
    const goalBonuses = GOAL_CHANNEL_BONUS[goalType] || {};
    const scores: Record<string, number> = {};
    for (const ch of ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']) {
      const prefScore = (channelCounts[ch] || 0) / totalPrefs;
      const engScore = engScores[ch] || 0;
      const goalBonus = goalBonuses[ch] || 0;
      scores[ch] = prefScore * 0.6 + engScore * 0.4 + goalBonus;
    }

    // Pick highest scoring channel
    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const bestChannel = ranked[0][0];
    const bestScore = ranked[0][1];
    const confidence = Math.round(Math.min(bestScore + 0.3, 1) * 100) / 100;

    const prefPct = Math.round(
      ((channelCounts[bestChannel] || 0) / totalPrefs) * 100,
    );
    const engDisplay = (engScores[bestChannel] || 0).toFixed(2);

    reasoning.push(
      `${bestChannel} selected: ${prefPct}% audience preference, ${engDisplay} avg engagement score`,
    );

    return {
      channel: bestChannel,
      confidence,
      reasoning: `${bestChannel} ranked highest with ${prefPct}% preference and ${engDisplay} engagement`,
    };
  }

  // ──────────────────────────────────────
  // Step 5: Message Generation
  // ──────────────────────────────────────

  private generateMessage(
    goalType: GoalType,
    channel: string,
    topPersona: string,
    reasoning: string[],
  ): MessageRecommendation {
    const goalTemplates =
      MESSAGE_TEMPLATES[goalType] || MESSAGE_TEMPLATES.CUSTOM;
    const channelTemplate = goalTemplates[channel] || goalTemplates.EMAIL;

    reasoning.push(
      `Message template selected for ${goalType} × ${channel} with personalization tokens: {{firstName}}, {{primaryPersona}}, {{topCategory}}`,
    );

    return {
      subject: channelTemplate.subject || null,
      body: channelTemplate.body,
    };
  }

  // ──────────────────────────────────────
  // Confidence computation
  // ──────────────────────────────────────

  private computeConfidence(
    audience: AudienceRecommendation,
    channel: ChannelRecommendation,
  ): number {
    let score = 0.5; // Base confidence

    // Audience factors
    if (audience.estimatedSize > 0) score += 0.1;
    if (audience.estimatedSize >= 10) score += 0.05;
    if (audience.topPersonas.length > 0) score += 0.1;
    if (audience.avgLifetimeValue > 0) score += 0.05;

    // Channel factors
    score += channel.confidence * 0.2;

    return Math.round(Math.min(score, 1) * 100) / 100;
  }

  // ──────────────────────────────────────
  // Persistence
  // ──────────────────────────────────────

  private async persistDecision(
    tenantId: string,
    goalText: string,
    goalType: GoalType,
    audience: AudienceRecommendation,
    offer: OfferRecommendation,
    channel: ChannelRecommendation,
    message: MessageRecommendation,
    reasoning: string[],
    confidence: number,
  ): Promise<string> {
    // Find or create BusinessGoal
    let businessGoal = await this.prisma.businessGoal.findFirst({
      where: { tenantId, goalType },
    });
    if (!businessGoal) {
      businessGoal = await this.prisma.businessGoal.create({
        data: { tenantId, name: goalText, goalType, status: 'ACTIVE' },
      });
    }

    // Create Decision
    const decision = await this.prisma.decision.create({
      data: {
        tenantId,
        goalId: businessGoal.id,
        goal: goalText,
        status: DecisionStatus.COMPLETED,
        audience: {
          segmentId: audience.segmentId,
          segmentName: audience.segmentName,
          estimatedSize: audience.estimatedSize,
          topPersonas: audience.topPersonas,
          avgLifetimeValue: audience.avgLifetimeValue,
        },
        offerRecommendation: {
          type: offer.type,
          name: offer.name,
          value: offer.value,
          reasoning: offer.reasoning,
        },
        channelRecommendation: {
          channel: channel.channel,
          confidence: channel.confidence,
          reasoning: channel.reasoning,
        },
        contentRecommendation: {
          subject: message.subject,
          body: message.body,
        },
        reasoning: reasoning.join('\n'),
        confidence,
      },
    });

    // Create DecisionRules
    const rules = [
      {
        tenantId,
        decisionId: decision.id,
        ruleName: 'Goal Classification',
        ruleType: 'GOAL',
        conditions: {
          goalText,
          keywords:
            GOAL_KEYWORDS.find((g) => g.goalType === goalType)?.keywords || [],
        },
        actions: { goalType },
        priority: 1,
      },
      {
        tenantId,
        decisionId: decision.id,
        ruleName: 'Audience Selection',
        ruleType: 'AUDIENCE',
        conditions: { goalType, patterns: SEGMENT_PATTERNS[goalType] || [] },
        actions: {
          segmentId: audience.segmentId,
          segmentName: audience.segmentName,
        },
        priority: 2,
      },
      {
        tenantId,
        decisionId: decision.id,
        ruleName: 'Offer Selection',
        ruleType: 'OFFER',
        conditions: {
          topPersona: audience.topPersonas[0] || 'default',
          goalType,
        },
        actions: {
          offerType: offer.type,
          offerName: offer.name,
          value: offer.value,
        },
        priority: 3,
      },
      {
        tenantId,
        decisionId: decision.id,
        ruleName: 'Channel Selection',
        ruleType: 'CHANNEL',
        conditions: { segmentId: audience.segmentId },
        actions: { channel: channel.channel, confidence: channel.confidence },
        priority: 4,
      },
    ];

    await this.prisma.decisionRule.createMany({ data: rules });

    // Create DecisionExplanations
    const explanations = reasoning.map((explanation, index) => ({
      tenantId,
      decisionId: decision.id,
      stepName:
        [
          'GOAL_CLASSIFICATION',
          'AUDIENCE_SELECTION',
          'OFFER_SELECTION',
          'CHANNEL_SELECTION',
          'MESSAGE_GENERATION',
        ][Math.min(index, 4)] || 'REASONING',
      explanation,
      stepOrder: index + 1,
      confidence,
    }));

    await this.prisma.decisionExplanation.createMany({ data: explanations });

    return decision.id;
  }
}
